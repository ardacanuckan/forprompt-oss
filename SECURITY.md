# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in ForPrompt, please report it responsibly.

### How to Report

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email security concerns directly to the maintainers or use GitHub's private vulnerability reporting feature.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution Target**: Within 30 days (depending on severity)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Security Best Practices

When self-hosting ForPrompt:

1. **Keep dependencies updated** - Run `pnpm update` regularly
2. **Secure your environment variables** - Never commit `.env` files
3. **Use HTTPS** - Always deploy with TLS
4. **Restrict API keys** - Use minimal required permissions
5. **Monitor logs** - Check for suspicious activity

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help us improve ForPrompt's security.
