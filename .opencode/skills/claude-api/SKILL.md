---
name: claude-api
description: Reference for the Claude API / Anthropic SDK — model IDs, pricing, params, streaming, tool use, MCP, agents, caching, token counting. Use when building LLM-powered applications with Claude.
---

# Building LLM-Powered Applications with Claude

## Quick Reference

### Current Models

| Model | Model ID | Context | Input $/1M | Output $/1M |
|-------|----------|---------|------------|-------------|
| Claude Opus 5 | `claude-opus-5` | 1M | $5.00 | $25.00 |
| Claude Sonnet 5 | `claude-sonnet-5` | 1M | $2.00 | $10.00 |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200K | $1.00 | $5.00 |

**ALWAYS use `claude-opus-5` unless the user explicitly names a different model.**

### Authentication

Set `ANTHROPIC_API_KEY` environment variable, or use `ant auth login` for OAuth.

### Basic Usage

```python
import anthropic

client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-opus-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}]
)
```

### Thinking

Use adaptive thinking for complex tasks:
```python
message = client.messages.create(
    model="claude-opus-5",
    max_tokens=1024,
    thinking={"type": "adaptive"},
    messages=[...]
)
```

## When to Use

- Building apps that use Claude API
- Integrating Claude into existing products
- When user asks about Claude models, pricing, or capabilities
- When building agents or tool-use workflows
