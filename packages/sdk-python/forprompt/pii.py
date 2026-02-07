"""
PII (Personally Identifiable Information) Detection and Redaction

SECURITY: This module helps protect user privacy by redacting
sensitive information before logging or transmission.

Supported PII types:
- Email addresses
- Phone numbers (US and international)
- Social Security Numbers (SSN)
- Credit card numbers
- IP addresses
"""

import re
from typing import List, Optional, Dict, Tuple
from .types import PIIRedactionConfig, PIIRedactionResult


# PII pattern definitions: (name, pattern, replacement)
PII_PATTERNS: List[Tuple[str, re.Pattern, str]] = [
    # Email addresses
    (
        "email",
        re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
        "[EMAIL_REDACTED]"
    ),

    # Phone numbers - US formats
    # Matches: (555) 123-4567, 555-123-4567, 555.123.4567, +1 555 123 4567
    (
        "phone",
        re.compile(r"(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}"),
        "[PHONE_REDACTED]"
    ),

    # Social Security Numbers
    # Matches: 123-45-6789, 123 45 6789, 123456789
    (
        "ssn",
        re.compile(r"\b[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{4}\b"),
        "[SSN_REDACTED]"
    ),

    # Credit card numbers (Visa, MasterCard, Amex, Discover)
    (
        "credit_card",
        re.compile(
            r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|"
            r"3[47][0-9]{13}|6(?:011|5[0-9][0-9])[0-9]{12})\b"
        ),
        "[CC_REDACTED]"
    ),

    # Credit card with separators
    (
        "credit_card_formatted",
        re.compile(
            r"\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|"
            r"6(?:011|5[0-9]{2}))[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b"
        ),
        "[CC_REDACTED]"
    ),

    # IPv4 addresses
    (
        "ip_v4",
        re.compile(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"),
        "[IP_REDACTED]"
    ),

    # IPv6 addresses (simplified)
    (
        "ip_v6",
        re.compile(r"\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b"),
        "[IP_REDACTED]"
    ),
]


def get_available_patterns() -> List[str]:
    """Get list of available PII pattern names."""
    return [name for name, _, _ in PII_PATTERNS]


def redact_pii(
    content: str,
    config: Optional[PIIRedactionConfig] = None
) -> PIIRedactionResult:
    """
    Redact PII from content.

    Args:
        content: The content to redact
        config: Redaction configuration (default: enabled)

    Returns:
        PIIRedactionResult with redacted content and statistics

    Example:
        >>> result = redact_pii("Contact me at john@example.com or (555) 123-4567")
        >>> print(result.redacted)
        Contact me at [EMAIL_REDACTED] or [PHONE_REDACTED]
        >>> print(result.redactions)
        ['email: 1 instance(s)', 'phone: 1 instance(s)']
    """
    if config is None:
        config = PIIRedactionConfig(enabled=True)

    # Return unchanged if disabled
    if not config.enabled:
        return PIIRedactionResult(
            redacted=content,
            redactions=[],
            counts={},
            has_pii=False
        )

    result = content
    redactions: List[str] = []
    counts: Dict[str, int] = {}

    # Get patterns to use
    patterns = PII_PATTERNS
    if config.patterns:
        patterns = [p for p in PII_PATTERNS if p[0] in config.patterns]

    # Apply each pattern
    for name, pattern, replacement in patterns:
        matches = pattern.findall(result)
        if matches:
            count = len(matches)
            counts[name] = count
            redactions.append(f"{name}: {count} instance(s)")
            result = pattern.sub(replacement, result)

    has_pii = len(redactions) > 0

    if has_pii and config.log_stats:
        print(f"PII redaction: {', '.join(redactions)}")

    return PIIRedactionResult(
        redacted=result,
        redactions=redactions,
        counts=counts,
        has_pii=has_pii
    )


def contains_pii(content: str, patterns: Optional[List[str]] = None) -> bool:
    """
    Check if content contains PII without redacting.

    Args:
        content: The content to check
        patterns: Specific patterns to check (default: all)

    Returns:
        True if PII is detected
    """
    patterns_to_check = PII_PATTERNS
    if patterns:
        patterns_to_check = [p for p in PII_PATTERNS if p[0] in patterns]

    for _, pattern, _ in patterns_to_check:
        if pattern.search(content):
            return True

    return False
