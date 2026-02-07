# forprompt

Python SDK for [ForPrompt](https://forprompt.dev) - fetch and manage AI prompts from your projects.

## Features

- **Sync & Async** - Both synchronous and asynchronous clients
- **Automatic Retry** - Exponential backoff for reliability
- **PII Redaction** - Automatic detection and redaction of sensitive data
- **Conversation Logging** - Track AI conversations with traces
- **Type Hints** - Full type annotations for IDE support

## Installation

```bash
pip install forprompt
```

## Quick Start

### Fetch Prompts

```python
from forprompt import ForPrompt

# Auto-loads API key from FORPROMPT_API_KEY env var
client = ForPrompt()

# Get active version
prompt = client.get_prompt("userContextPrompt")
print(prompt.system_prompt)

# Get specific version
prompt_v2 = client.get_prompt("userContextPrompt", version=2)
```

### Async Usage

```python
from forprompt import AsyncForPrompt
import asyncio

async def main():
    client = AsyncForPrompt()
    prompt = await client.get_prompt("my-prompt")
    print(prompt.system_prompt)

asyncio.run(main())
```

### Custom Configuration

```python
from forprompt import ForPrompt

client = ForPrompt(
    api_key="fp_xxx",
    base_url="https://your-backend.convex.site",  # Self-hosted URL
    timeout=30.0,
    max_retries=3
)
```

## Conversation Logging

Track AI conversations with automatic tracing.

### Synchronous Logger

```python
from forprompt import ForPromptLogger

logger = ForPromptLogger()

# Start a trace
trace_id = logger.start_trace("onboarding", version_number=2)

# Log messages (PII auto-redacted)
logger.log(role="user", content="Hello, my email is john@example.com")
logger.log(
    role="assistant",
    content="Hi there!",
    model="gpt-4o",
    tokens={"input": 10, "output": 50},
    duration_ms=1200
)

# End trace
logger.end_trace()
```

### Async Logger

```python
from forprompt import AsyncForPromptLogger
import asyncio

async def main():
    logger = AsyncForPromptLogger()

    trace_id = await logger.start_trace("my-prompt")
    await logger.log(role="user", content="Hello!")
    await logger.log(role="assistant", content="Hi!")
    await logger.end_trace()

asyncio.run(main())
```

### Single Request Logging

For one-shot API calls without conversation tracking:

```python
from forprompt import ForPromptLogger

logger = ForPromptLogger()

# Log a single request/response pair
trace_id = logger.log_request(
    prompt_key="aicoaching",
    version_number=2,
    input="How do I learn Python?",
    output="Here are 5 steps...",
    model="gpt-4o",
    tokens={"input": 10, "output": 150},
    duration_ms=1200
)
```

## PII Redaction

Automatically detect and redact sensitive information.

```python
from forprompt import redact_pii, contains_pii, get_available_patterns

# Check for PII
text = "Contact me at john@example.com or 555-123-4567"
if contains_pii(text):
    # Redact PII
    safe_text = redact_pii(text)
    print(safe_text)
    # Output: "Contact me at [EMAIL] or [PHONE]"

# See available patterns
patterns = get_available_patterns()
print(patterns)  # ['email', 'phone', 'ssn', 'credit_card', ...]
```

### Selective Redaction

```python
# Only redact emails and phones
safe_text = redact_pii(text, patterns=["email", "phone"])

# Redact everything except names
safe_text = redact_pii(text, exclude_patterns=["name"])
```

## Error Handling

```python
from forprompt import ForPrompt, ForPromptError, ErrorCode

client = ForPrompt()

try:
    prompt = client.get_prompt("nonexistent")
except ForPromptError as e:
    if e.code == ErrorCode.NOT_FOUND:
        print("Prompt not found")
    elif e.code == ErrorCode.UNAUTHORIZED:
        print("Invalid API key")
    elif e.code == ErrorCode.RATE_LIMITED:
        print("Too many requests")
    else:
        print(f"Error: {e.message}")
```

## API Reference

### ForPrompt / AsyncForPrompt

| Method                          | Description            |
| ------------------------------- | ---------------------- |
| `get_prompt(key, version=None)` | Fetch a prompt by key  |
| `get_prompts()`                 | List all prompts       |
| `search_prompts(query)`         | Search prompts by text |

### ForPromptLogger / AsyncForPromptLogger

| Method                                         | Description                    |
| ---------------------------------------------- | ------------------------------ |
| `start_trace(prompt_key, version_number=None)` | Start a conversation trace     |
| `log(role, content, **kwargs)`                 | Log a message in current trace |
| `end_trace()`                                  | End the current trace          |
| `log_request(**kwargs)`                        | Log a single request/response  |

### Prompt Object

```python
prompt.key              # Prompt identifier
prompt.name             # Display name
prompt.system_prompt    # The actual prompt text
prompt.version_number   # Current version
prompt.purpose          # What the prompt does
prompt.expected_behavior # How AI should behave
prompt.constraints      # Limitations
prompt.tools            # Associated tools
prompt.metadata         # Additional metadata
```

## Environment Variables

| Variable             | Description                      |
| -------------------- | -------------------------------- |
| `FORPROMPT_API_KEY`  | Your project API key (required)  |
| `FORPROMPT_BASE_URL` | Custom API URL (for self-hosted) |

## Requirements

- Python 3.8+
- httpx >= 0.24.0

## License

MIT

## Links

- [ForPrompt Dashboard](https://forprompt.dev)
- [TypeScript SDK](https://www.npmjs.com/package/@forprompt/sdk)
- [GitHub](https://github.com/ardacanuckan/forprompt-oss)
