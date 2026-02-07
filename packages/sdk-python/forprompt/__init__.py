"""
ForPrompt SDK

Fetch and manage prompts from your ForPrompt projects.

Features:
- Synchronous and asynchronous clients
- Automatic timeout and retry with exponential backoff
- PII (Personally Identifiable Information) redaction
- Conversation logging and tracing

Example:
    >>> from forprompt import ForPrompt
    >>>
    >>> # Auto-loads API key from FORPROMPT_API_KEY env var
    >>> client = ForPrompt()
    >>>
    >>> # Get active version
    >>> prompt = client.get_prompt("userContextPrompt")
    >>> print(prompt.system_prompt)
    >>>
    >>> # Get specific version
    >>> prompt_v2 = client.get_prompt("userContextPrompt", version=2)

Async example:
    >>> from forprompt import AsyncForPrompt
    >>> import asyncio
    >>>
    >>> async def main():
    ...     client = AsyncForPrompt()
    ...     prompt = await client.get_prompt("my-prompt")
    ...     print(prompt.system_prompt)
    >>>
    >>> asyncio.run(main())

Logging example:
    >>> from forprompt import ForPromptLogger
    >>>
    >>> logger = ForPromptLogger()
    >>> trace_id = logger.start_trace("my-prompt")
    >>> logger.log(role="user", content="Hello!")  # PII auto-redacted
    >>> logger.log(role="assistant", content="Hi there!")
    >>> logger.end_trace()
"""

from .client import ForPrompt, AsyncForPrompt
from .logger import ForPromptLogger, AsyncForPromptLogger
from .types import Prompt, ForPromptError, ErrorCode
from .pii import redact_pii, contains_pii, get_available_patterns

__version__ = "0.1.0"
__all__ = [
    # Clients
    "ForPrompt",
    "AsyncForPrompt",
    # Loggers
    "ForPromptLogger",
    "AsyncForPromptLogger",
    # Types
    "Prompt",
    "ForPromptError",
    "ErrorCode",
    # PII utilities
    "redact_pii",
    "contains_pii",
    "get_available_patterns",
]
