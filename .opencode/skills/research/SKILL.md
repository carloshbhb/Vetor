---
name: research
description: Investigate a question against high-trust primary sources and capture findings as a Markdown file. Use when researching topics, gathering docs/API facts, or delegating reading to a background agent.
---

# Research

Investigate a question against **primary sources** (official docs, source code, specs, first-party APIs), not secondary write-ups.

## Process

1. **Identify primary sources** - Official documentation, source code, specifications
2. **Investigate systematically** - Follow every claim back to the source that owns it
3. **Capture findings** - Write to a single Markdown file with citations
4. **Save appropriately** - Match existing repo conventions for notes

## Output Format

```markdown
# Research: [Topic]

## Summary
[Brief overview of findings]

## Findings

### [Question/Finding 1]
[Details with source citation]

### [Question/Finding 2]
[Details with source citation]

## Sources
- [Source 1] - [URL/Reference]
- [Source 2] - [URL/Reference]
```

## When to Use

- User wants a topic researched
- Need to gather documentation or API facts
- Reading legwork should be delegated
- Before making architectural decisions
- When evaluating libraries or tools
