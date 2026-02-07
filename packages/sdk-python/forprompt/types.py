"""
ForPrompt SDK Type Definitions

This module defines the data types used throughout the SDK.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from enum import Enum


class ErrorCode(str, Enum):
    """Error codes for ForPromptError"""
    MISSING_API_KEY = "MISSING_API_KEY"
    INVALID_INPUT = "INVALID_INPUT"
    PROMPT_NOT_FOUND = "PROMPT_NOT_FOUND"
    API_ERROR = "API_ERROR"
    TIMEOUT = "TIMEOUT"
    NETWORK_ERROR = "NETWORK_ERROR"
    SERVER_ERROR = "SERVER_ERROR"
    RETRY_EXHAUSTED = "RETRY_EXHAUSTED"
    LOG_ERROR = "LOG_ERROR"


class ForPromptError(Exception):
    """
    Custom exception for ForPrompt SDK errors.

    Attributes:
        message: Human-readable error message
        status_code: HTTP status code (if applicable)
        code: Error code for programmatic handling
    """

    def __init__(
        self,
        message: str,
        status_code: int = 0,
        code: str = "UNKNOWN"
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code

    def __str__(self) -> str:
        return f"ForPromptError({self.code}): {self.message}"

    def __repr__(self) -> str:
        return f"ForPromptError(message={self.message!r}, status_code={self.status_code}, code={self.code!r})"


@dataclass
class Prompt:
    """
    Represents a prompt fetched from ForPrompt.

    Attributes:
        key: Unique identifier for the prompt
        name: Display name of the prompt
        version_number: Version number of this prompt
        system_prompt: The actual system prompt content
        updated_at: Timestamp of last update (Unix ms)
        description: Optional description
        purpose: Primary goal of the prompt
        expected_behavior: How the prompt should behave
        input_format: Expected input structure
        output_format: Expected output structure
        constraints: Limitations and rules
        use_cases: Primary use cases
        additional_notes: Free-form documentation
        tools_notes: Notes about tool usage strategy
    """
    key: str
    name: str
    version_number: int
    system_prompt: str
    updated_at: int
    description: Optional[str] = None
    purpose: Optional[str] = None
    expected_behavior: Optional[str] = None
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    use_cases: Optional[str] = None
    additional_notes: Optional[str] = None
    tools_notes: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Prompt":
        """Create a Prompt from API response dictionary."""
        return cls(
            key=data["key"],
            name=data["name"],
            version_number=data["versionNumber"],
            system_prompt=data["systemPrompt"],
            updated_at=data["updatedAt"],
            description=data.get("description"),
            purpose=data.get("purpose"),
            expected_behavior=data.get("expectedBehavior"),
            input_format=data.get("inputFormat"),
            output_format=data.get("outputFormat"),
            constraints=data.get("constraints"),
            use_cases=data.get("useCases"),
            additional_notes=data.get("additionalNotes"),
            tools_notes=data.get("toolsNotes"),
        )


@dataclass
class Tool:
    """
    Represents a tool definition.

    Attributes:
        id: Unique identifier
        name: Tool name
        description: What the tool does
        parameters: JSON schema of parameters
        category: Tool category
        example_usage: Example of how to use
    """
    id: str
    name: str
    description: str
    parameters: str
    category: Optional[str] = None
    example_usage: Optional[str] = None


@dataclass
class GetPromptOptions:
    """
    Options for fetching a prompt.

    Attributes:
        version: Specific version number to fetch (optional)
    """
    version: Optional[int] = None


@dataclass
class ClientConfig:
    """
    Configuration for the ForPrompt client.

    Attributes:
        api_key: Project API key (required)
        base_url: Base URL for API (default: https://forprompt.dev)
        timeout: Request timeout in seconds (default: 30.0)
        retries: Number of retry attempts (default: 3)
        redact_pii: Enable PII redaction in logging (default: True)
    """
    api_key: str
    base_url: str = "https://forprompt.dev"
    timeout: float = 30.0
    retries: int = 3
    redact_pii: bool = True


@dataclass
class LogOptions:
    """
    Options for logging a message.

    Attributes:
        role: Message role (user, assistant, system)
        content: Message content
        model: Optional model name
        input_tokens: Optional input token count
        output_tokens: Optional output token count
        duration_ms: Optional duration in milliseconds
        metadata: Optional additional metadata
        redact_pii: Override PII redaction setting
    """
    role: str
    content: str
    model: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    duration_ms: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    redact_pii: Optional[bool] = None


@dataclass
class PIIRedactionConfig:
    """
    Configuration for PII redaction.

    Attributes:
        enabled: Enable PII redaction (default: True)
        patterns: Specific patterns to use (default: all)
        log_stats: Log redaction statistics (default: False)
    """
    enabled: bool = True
    patterns: Optional[List[str]] = None
    log_stats: bool = False


@dataclass
class PIIRedactionResult:
    """
    Result of PII redaction.

    Attributes:
        redacted: The redacted content
        redactions: Summary of redactions made
        counts: Count of each PII type found
        has_pii: Whether any PII was found
    """
    redacted: str
    redactions: List[str] = field(default_factory=list)
    counts: Dict[str, int] = field(default_factory=dict)
    has_pii: bool = False
