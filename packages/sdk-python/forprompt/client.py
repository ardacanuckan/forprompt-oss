"""
ForPrompt Client

Provides both synchronous and asynchronous clients for the ForPrompt API.

Example:
    >>> from forprompt import ForPrompt
    >>> client = ForPrompt(api_key="fp_proj_xxx")
    >>> prompt = client.get_prompt("my-prompt")
    >>> print(prompt.system_prompt)
"""

import os
import time
import asyncio
from typing import Optional, Dict, List, Any

import httpx

from .types import (
    Prompt,
    GetPromptOptions,
    ClientConfig,
    ForPromptError,
    ErrorCode,
)
from .pii import redact_pii, PIIRedactionConfig


DEFAULT_BASE_URL = "https://forprompt.dev"
DEFAULT_TIMEOUT = 30.0
DEFAULT_RETRIES = 3


def _get_backoff_delay(attempt: int) -> float:
    """Calculate exponential backoff delay with jitter."""
    import random
    base_delay = (2 ** attempt)  # 1s, 2s, 4s, ...
    jitter = random.random() * 0.5  # 0-0.5s random jitter
    return min(base_delay + jitter, 30.0)  # Max 30s


class ForPrompt:
    """
    Synchronous ForPrompt client.

    Args:
        api_key: Project API key. If not provided, reads from FORPROMPT_API_KEY env var.
        base_url: Base URL for the API. Default: https://forprompt.dev
        timeout: Request timeout in seconds. Default: 30.0
        retries: Number of retry attempts for failed requests. Default: 3
        redact_pii: Enable PII redaction in logging. Default: True

    Example:
        >>> client = ForPrompt(api_key="fp_proj_xxx")
        >>> prompt = client.get_prompt("my-prompt")
        >>> print(prompt.system_prompt)

        # Or use environment variable
        >>> # Set FORPROMPT_API_KEY in environment
        >>> client = ForPrompt()
        >>> prompt = client.get_prompt("my-prompt")
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        retries: int = DEFAULT_RETRIES,
        redact_pii: bool = True,
    ):
        self.api_key = api_key or os.environ.get("FORPROMPT_API_KEY", "")
        self.base_url = (
            base_url or os.environ.get("FORPROMPT_BASE_URL", DEFAULT_BASE_URL)
        ).rstrip("/")
        self.timeout = timeout
        self.retries = retries
        self.redact_pii_enabled = redact_pii

        if not self.api_key:
            raise ForPromptError(
                "API key is required. Set FORPROMPT_API_KEY environment variable "
                "or pass api_key parameter.",
                401,
                ErrorCode.MISSING_API_KEY
            )

    def _make_request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, str]] = None,
        json: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make an HTTP request with retry and timeout."""
        url = f"{self.base_url}{path}"
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
        }

        last_error: Optional[Exception] = None

        for attempt in range(self.retries):
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.request(
                        method=method,
                        url=url,
                        headers=headers,
                        params=params,
                        json=json,
                    )

                    # Don't retry client errors (4xx)
                    if 400 <= response.status_code < 500:
                        try:
                            error_data = response.json()
                        except Exception:
                            error_data = {"error": "Unknown error"}

                        raise ForPromptError(
                            error_data.get("error", f"HTTP {response.status_code}"),
                            response.status_code,
                            ErrorCode.PROMPT_NOT_FOUND if response.status_code == 404
                            else ErrorCode.API_ERROR
                        )

                    # Success
                    if response.is_success:
                        return response.json()

                    # Server error (5xx) - will retry
                    last_error = ForPromptError(
                        f"Server error: {response.status_code}",
                        response.status_code,
                        ErrorCode.SERVER_ERROR
                    )

            except httpx.TimeoutException:
                last_error = ForPromptError(
                    f"Request timeout after {self.timeout}s",
                    408,
                    ErrorCode.TIMEOUT
                )
                # Don't retry timeout errors
                raise last_error

            except httpx.RequestError as e:
                last_error = ForPromptError(
                    str(e),
                    0,
                    ErrorCode.NETWORK_ERROR
                )

            except ForPromptError:
                # Re-raise ForPromptErrors (client errors)
                raise

            # Wait before retrying (unless this is the last attempt)
            if attempt < self.retries - 1:
                delay = _get_backoff_delay(attempt)
                time.sleep(delay)

        raise last_error or ForPromptError(
            "Request failed after retries",
            500,
            ErrorCode.RETRY_EXHAUSTED
        )

    def get_prompt(
        self,
        key: str,
        version: Optional[int] = None
    ) -> Prompt:
        """
        Get a prompt by its key.

        Args:
            key: The prompt key (unique identifier)
            version: Optional specific version number to fetch

        Returns:
            Prompt object with all metadata

        Raises:
            ForPromptError: If the request fails

        Example:
            >>> prompt = client.get_prompt("my-prompt")
            >>> print(prompt.system_prompt)

            # Get specific version
            >>> prompt = client.get_prompt("my-prompt", version=2)
        """
        # Input validation
        if not key or not isinstance(key, str):
            raise ForPromptError(
                "Prompt key must be a non-empty string",
                400,
                ErrorCode.INVALID_INPUT
            )

        if len(key) > 256:
            raise ForPromptError(
                "Prompt key must be 256 characters or less",
                400,
                ErrorCode.INVALID_INPUT
            )

        if version is not None:
            if not isinstance(version, int) or version < 1:
                raise ForPromptError(
                    "Version must be a positive integer",
                    400,
                    ErrorCode.INVALID_INPUT
                )

        params: Dict[str, str] = {"key": key}
        if version is not None:
            params["version"] = str(version)

        data = self._make_request("GET", "/api/prompts", params=params)
        return Prompt.from_dict(data)

    def get_prompts(
        self,
        keys: List[str],
        version: Optional[int] = None
    ) -> Dict[str, Prompt]:
        """
        Get multiple prompts by their keys.

        Requests are made with concurrency limit to avoid overwhelming the server.

        Args:
            keys: List of prompt keys to fetch
            version: Optional specific version number to fetch for all prompts

        Returns:
            Dictionary mapping keys to Prompt objects (missing prompts omitted)

        Example:
            >>> prompts = client.get_prompts(["prompt-1", "prompt-2"])
            >>> print(prompts["prompt-1"].system_prompt)
        """
        result: Dict[str, Prompt] = {}

        # Limit concurrent requests
        CONCURRENCY_LIMIT = 5

        for i in range(0, len(keys), CONCURRENCY_LIMIT):
            batch = keys[i:i + CONCURRENCY_LIMIT]

            for key in batch:
                try:
                    prompt = self.get_prompt(key, version)
                    result[key] = prompt
                except ForPromptError:
                    # Skip failed prompts
                    pass

        return result


class AsyncForPrompt:
    """
    Asynchronous ForPrompt client.

    Args:
        api_key: Project API key. If not provided, reads from FORPROMPT_API_KEY env var.
        base_url: Base URL for the API. Default: https://forprompt.dev
        timeout: Request timeout in seconds. Default: 30.0
        retries: Number of retry attempts for failed requests. Default: 3
        redact_pii: Enable PII redaction in logging. Default: True

    Example:
        >>> async def main():
        ...     client = AsyncForPrompt(api_key="fp_proj_xxx")
        ...     prompt = await client.get_prompt("my-prompt")
        ...     print(prompt.system_prompt)
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        retries: int = DEFAULT_RETRIES,
        redact_pii: bool = True,
    ):
        self.api_key = api_key or os.environ.get("FORPROMPT_API_KEY", "")
        self.base_url = (
            base_url or os.environ.get("FORPROMPT_BASE_URL", DEFAULT_BASE_URL)
        ).rstrip("/")
        self.timeout = timeout
        self.retries = retries
        self.redact_pii_enabled = redact_pii

        if not self.api_key:
            raise ForPromptError(
                "API key is required. Set FORPROMPT_API_KEY environment variable "
                "or pass api_key parameter.",
                401,
                ErrorCode.MISSING_API_KEY
            )

    async def _make_request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, str]] = None,
        json: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make an async HTTP request with retry and timeout."""
        url = f"{self.base_url}{path}"
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
        }

        last_error: Optional[Exception] = None

        for attempt in range(self.retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.request(
                        method=method,
                        url=url,
                        headers=headers,
                        params=params,
                        json=json,
                    )

                    # Don't retry client errors (4xx)
                    if 400 <= response.status_code < 500:
                        try:
                            error_data = response.json()
                        except Exception:
                            error_data = {"error": "Unknown error"}

                        raise ForPromptError(
                            error_data.get("error", f"HTTP {response.status_code}"),
                            response.status_code,
                            ErrorCode.PROMPT_NOT_FOUND if response.status_code == 404
                            else ErrorCode.API_ERROR
                        )

                    # Success
                    if response.is_success:
                        return response.json()

                    # Server error (5xx) - will retry
                    last_error = ForPromptError(
                        f"Server error: {response.status_code}",
                        response.status_code,
                        ErrorCode.SERVER_ERROR
                    )

            except httpx.TimeoutException:
                last_error = ForPromptError(
                    f"Request timeout after {self.timeout}s",
                    408,
                    ErrorCode.TIMEOUT
                )
                # Don't retry timeout errors
                raise last_error

            except httpx.RequestError as e:
                last_error = ForPromptError(
                    str(e),
                    0,
                    ErrorCode.NETWORK_ERROR
                )

            except ForPromptError:
                # Re-raise ForPromptErrors (client errors)
                raise

            # Wait before retrying (unless this is the last attempt)
            if attempt < self.retries - 1:
                delay = _get_backoff_delay(attempt)
                await asyncio.sleep(delay)

        raise last_error or ForPromptError(
            "Request failed after retries",
            500,
            ErrorCode.RETRY_EXHAUSTED
        )

    async def get_prompt(
        self,
        key: str,
        version: Optional[int] = None
    ) -> Prompt:
        """
        Get a prompt by its key.

        Args:
            key: The prompt key (unique identifier)
            version: Optional specific version number to fetch

        Returns:
            Prompt object with all metadata

        Raises:
            ForPromptError: If the request fails
        """
        # Input validation
        if not key or not isinstance(key, str):
            raise ForPromptError(
                "Prompt key must be a non-empty string",
                400,
                ErrorCode.INVALID_INPUT
            )

        if len(key) > 256:
            raise ForPromptError(
                "Prompt key must be 256 characters or less",
                400,
                ErrorCode.INVALID_INPUT
            )

        if version is not None:
            if not isinstance(version, int) or version < 1:
                raise ForPromptError(
                    "Version must be a positive integer",
                    400,
                    ErrorCode.INVALID_INPUT
                )

        params: Dict[str, str] = {"key": key}
        if version is not None:
            params["version"] = str(version)

        data = await self._make_request("GET", "/api/prompts", params=params)
        return Prompt.from_dict(data)

    async def get_prompts(
        self,
        keys: List[str],
        version: Optional[int] = None
    ) -> Dict[str, Prompt]:
        """
        Get multiple prompts by their keys.

        Requests are made concurrently with a concurrency limit.

        Args:
            keys: List of prompt keys to fetch
            version: Optional specific version number to fetch for all prompts

        Returns:
            Dictionary mapping keys to Prompt objects (missing prompts omitted)
        """
        result: Dict[str, Prompt] = {}

        # Limit concurrent requests
        CONCURRENCY_LIMIT = 5
        semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

        async def fetch_one(key: str) -> Optional[Prompt]:
            async with semaphore:
                try:
                    return await self.get_prompt(key, version)
                except ForPromptError:
                    return None

        tasks = [fetch_one(key) for key in keys]
        results = await asyncio.gather(*tasks)

        for key, prompt in zip(keys, results):
            if prompt is not None:
                result[key] = prompt

        return result
