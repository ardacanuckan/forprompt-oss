"""
ForPrompt Logger

Provides conversation logging and tracing capabilities.
Supports automatic PII redaction for user privacy.
"""

import os
import uuid
from typing import Optional, Dict, Any

import httpx

from .types import (
    ForPromptError,
    ErrorCode,
    LogOptions,
    PIIRedactionConfig,
)
from .pii import redact_pii


DEFAULT_BASE_URL = "https://forprompt.dev"
DEFAULT_TIMEOUT = 30.0


class ForPromptLogger:
    """
    Logger for tracking conversations and interactions with ForPrompt.

    Supports:
    - Trace-based conversation logging
    - Automatic PII redaction
    - Single request logging

    Args:
        api_key: Project API key
        base_url: Base URL for the API
        source: Source identifier (e.g., "python-sdk", "my-app")
        redact_pii: Enable PII redaction (default: True)
        timeout: Request timeout in seconds

    Example:
        >>> logger = ForPromptLogger(api_key="fp_proj_xxx")
        >>> trace_id = logger.start_trace("my-prompt")
        >>> logger.log(role="user", content="Hello!")
        >>> logger.log(role="assistant", content="Hi there!")
        >>> logger.end_trace()
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        source: str = "python-sdk",
        redact_pii: bool = True,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        self.api_key = api_key or os.environ.get("FORPROMPT_API_KEY", "")
        self.base_url = (
            base_url or os.environ.get("FORPROMPT_BASE_URL", DEFAULT_BASE_URL)
        ).rstrip("/")
        self.source = source
        self.redact_pii_enabled = redact_pii
        self.timeout = timeout

        # Trace state
        self._trace_id: Optional[str] = None
        self._prompt_key: Optional[str] = None
        self._version_number: Optional[int] = None

        if not self.api_key:
            raise ForPromptError(
                "API key is required. Set FORPROMPT_API_KEY environment variable "
                "or pass api_key parameter.",
                401,
                ErrorCode.MISSING_API_KEY
            )

    def start_trace(
        self,
        prompt_key: str,
        trace_id: Optional[str] = None,
        version_number: Optional[int] = None
    ) -> str:
        """
        Start a new trace for logging a conversation.

        Args:
            prompt_key: The prompt key associated with this trace
            trace_id: Optional custom trace ID (auto-generated if not provided)
            version_number: Optional prompt version number

        Returns:
            The trace ID

        Example:
            >>> trace_id = logger.start_trace("my-prompt")
            >>> # ... log messages ...
            >>> logger.end_trace()
        """
        self._trace_id = trace_id or str(uuid.uuid4())
        self._prompt_key = prompt_key
        self._version_number = version_number
        return self._trace_id

    def log(
        self,
        role: str,
        content: str,
        model: Optional[str] = None,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        duration_ms: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        redact_pii_override: Optional[bool] = None,
    ) -> None:
        """
        Log a message in the current trace.

        Args:
            role: Message role ("user", "assistant", "system")
            content: Message content
            model: Optional model name
            input_tokens: Optional input token count
            output_tokens: Optional output token count
            duration_ms: Optional duration in milliseconds
            metadata: Optional additional metadata
            redact_pii_override: Override the default PII redaction setting

        Raises:
            ForPromptError: If logging fails

        Example:
            >>> logger.log(role="user", content="Hello!")
            >>> logger.log(
            ...     role="assistant",
            ...     content="Hi there!",
            ...     model="gpt-4",
            ...     output_tokens=10
            ... )
        """
        if not self._trace_id:
            self._trace_id = str(uuid.uuid4())

        # Apply PII redaction
        should_redact = (
            redact_pii_override
            if redact_pii_override is not None
            else self.redact_pii_enabled
        )

        if should_redact:
            result = redact_pii(content, PIIRedactionConfig(enabled=True))
            safe_content = result.redacted

            # Add redaction info to metadata if PII was found
            if result.has_pii:
                metadata = metadata or {}
                metadata["pii_redactions"] = result.redactions
        else:
            safe_content = content

        payload = {
            "traceId": self._trace_id,
            "promptKey": self._prompt_key or "unknown",
            "versionNumber": self._version_number,
            "type": "message",
            "role": role,
            "content": safe_content,
            "model": model,
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "durationMs": duration_ms,
            "source": self.source,
            "metadata": metadata,
        }

        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    f"{self.base_url}/api/log",
                    headers={
                        "Content-Type": "application/json",
                        "X-API-Key": self.api_key,
                    },
                    json=payload,
                )

                if not response.is_success:
                    try:
                        error_data = response.json()
                    except Exception:
                        error_data = {}

                    raise ForPromptError(
                        error_data.get("error", "Failed to log"),
                        response.status_code,
                        ErrorCode.LOG_ERROR
                    )

        except httpx.RequestError as e:
            raise ForPromptError(
                f"Network error: {str(e)}",
                0,
                ErrorCode.NETWORK_ERROR
            )

    def end_trace(self) -> None:
        """
        End the current trace.

        After calling this, start_trace must be called again before logging.
        """
        self._trace_id = None
        self._prompt_key = None
        self._version_number = None

    def log_request(
        self,
        prompt_key: str,
        role: str,
        content: str,
        model: Optional[str] = None,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        duration_ms: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        version_number: Optional[int] = None,
    ) -> str:
        """
        Log a single request without managing trace state.

        Creates a new trace, logs the message, and returns the trace ID.

        Args:
            prompt_key: The prompt key
            role: Message role
            content: Message content
            model: Optional model name
            input_tokens: Optional input token count
            output_tokens: Optional output token count
            duration_ms: Optional duration in milliseconds
            metadata: Optional additional metadata
            version_number: Optional prompt version number

        Returns:
            The trace ID

        Example:
            >>> trace_id = logger.log_request(
            ...     prompt_key="my-prompt",
            ...     role="user",
            ...     content="Hello!",
            ...     model="gpt-4"
            ... )
        """
        trace_id = self.start_trace(prompt_key, version_number=version_number)

        self.log(
            role=role,
            content=content,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            duration_ms=duration_ms,
            metadata=metadata,
        )

        self.end_trace()
        return trace_id

    @property
    def trace_id(self) -> Optional[str]:
        """Get the current trace ID, or None if no trace is active."""
        return self._trace_id

    @property
    def is_tracing(self) -> bool:
        """Check if a trace is currently active."""
        return self._trace_id is not None


class AsyncForPromptLogger:
    """
    Async logger for tracking conversations with ForPrompt.

    Same interface as ForPromptLogger but with async methods.

    Example:
        >>> async def main():
        ...     logger = AsyncForPromptLogger(api_key="fp_proj_xxx")
        ...     trace_id = logger.start_trace("my-prompt")
        ...     await logger.log(role="user", content="Hello!")
        ...     await logger.log(role="assistant", content="Hi!")
        ...     logger.end_trace()
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        source: str = "python-sdk",
        redact_pii: bool = True,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        self.api_key = api_key or os.environ.get("FORPROMPT_API_KEY", "")
        self.base_url = (
            base_url or os.environ.get("FORPROMPT_BASE_URL", DEFAULT_BASE_URL)
        ).rstrip("/")
        self.source = source
        self.redact_pii_enabled = redact_pii
        self.timeout = timeout

        self._trace_id: Optional[str] = None
        self._prompt_key: Optional[str] = None
        self._version_number: Optional[int] = None

        if not self.api_key:
            raise ForPromptError(
                "API key is required.",
                401,
                ErrorCode.MISSING_API_KEY
            )

    def start_trace(
        self,
        prompt_key: str,
        trace_id: Optional[str] = None,
        version_number: Optional[int] = None
    ) -> str:
        """Start a new trace."""
        self._trace_id = trace_id or str(uuid.uuid4())
        self._prompt_key = prompt_key
        self._version_number = version_number
        return self._trace_id

    async def log(
        self,
        role: str,
        content: str,
        model: Optional[str] = None,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        duration_ms: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        redact_pii_override: Optional[bool] = None,
    ) -> None:
        """Log a message in the current trace (async)."""
        if not self._trace_id:
            self._trace_id = str(uuid.uuid4())

        should_redact = (
            redact_pii_override
            if redact_pii_override is not None
            else self.redact_pii_enabled
        )

        if should_redact:
            result = redact_pii(content, PIIRedactionConfig(enabled=True))
            safe_content = result.redacted
            if result.has_pii:
                metadata = metadata or {}
                metadata["pii_redactions"] = result.redactions
        else:
            safe_content = content

        payload = {
            "traceId": self._trace_id,
            "promptKey": self._prompt_key or "unknown",
            "versionNumber": self._version_number,
            "type": "message",
            "role": role,
            "content": safe_content,
            "model": model,
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "durationMs": duration_ms,
            "source": self.source,
            "metadata": metadata,
        }

        payload = {k: v for k, v in payload.items() if v is not None}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/log",
                    headers={
                        "Content-Type": "application/json",
                        "X-API-Key": self.api_key,
                    },
                    json=payload,
                )

                if not response.is_success:
                    try:
                        error_data = response.json()
                    except Exception:
                        error_data = {}

                    raise ForPromptError(
                        error_data.get("error", "Failed to log"),
                        response.status_code,
                        ErrorCode.LOG_ERROR
                    )

        except httpx.RequestError as e:
            raise ForPromptError(
                f"Network error: {str(e)}",
                0,
                ErrorCode.NETWORK_ERROR
            )

    def end_trace(self) -> None:
        """End the current trace."""
        self._trace_id = None
        self._prompt_key = None
        self._version_number = None

    @property
    def trace_id(self) -> Optional[str]:
        """Get the current trace ID."""
        return self._trace_id

    @property
    def is_tracing(self) -> bool:
        """Check if a trace is active."""
        return self._trace_id is not None
