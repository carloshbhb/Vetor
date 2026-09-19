---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up. Use when ending a session or transferring work.
---

# Handoff

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

## Process

1. **Summarize the conversation** - What was discussed, decided, and done
2. **Capture current state** - Where things stand right now
3. **List next steps** - What needs to happen next
4. **Reference artifacts** - Link to specs, plans, ADRs, issues, commits, diffs
5. **Suggest skills** - Name which skills the next agent should use
6. **Redact secrets** - Remove API keys, passwords, PII
7. **Save to temp directory** - Not the current workspace

## Document Structure

```markdown
# Handoff: [Topic]

## Summary
[What happened in this session]

## Current State
[Where things stand]

## Next Steps
[What needs to happen]

## Artifacts
[References to files, commits, specs]

## Suggested Skills
[Which skills to load next]

## Context
[Any other relevant information]
```

## When to Use

- Ending a session
- Transferring work to another agent
- Before a long break
- When context is getting too large
