---
name: ruflo-adaptive-memory
description: >-
  Ruflo Adaptive Memory - persistent memory system that captures lessons, patterns,
  and instincts across sessions with confidence scoring and auto-promotion.
---

# Ruflo Adaptive Memory Skill

Purpose: Implement persistent, self-learning memory system for AI agents following ruflo patterns.

## Memory Storage Tiers

| Tier | Persistence | Access Speed | Use Case |
|------|-------------|--------------|----------|
| Working | RAM only | Instant | Current session context |
| Short-term | Local storage (JSON) | < 100ms | Recent task history |
| Long-term | Encrypted disk + AgentDB | < 500ms | Cross-session patterns |
| Permanent | Vector database (HNSW) | 1-5s | Reusable skills/knowledge |

## Confidence Scoring

Each stored lesson receives a confidence score (0.0 - 1.0) based on:
- **Success rate**: How often this pattern led to successful outcomes
- **Reusability**: Applicability across different projects/contexts
- **Recency**: How recently the pattern was validated
- **Evidence quality**: Quality of supporting data/traces

**Scoring Formula:**
```
confidence = (successes / attempts) × reusability × recency_factor × evidence_weight
```

## Storage Commands

### Store a Lesson
```bash
npx claude-flow memory store \
  --lesson "Use hydration-aware caching for Next.js API routes" \
  --confidence 0.92 \
  --domain "nextjs-performance" \
  --tags ["caching", "nextjs", "performance", "optimization"] \
  --evidence "Reduced API route response time by 40% in vetor-blog project"
```

### Retrieve Lessons
```bash
# Search by domain
npx claude-flow memory search \
  --query "caching nextjs" \
  --domain "nextjs-performance" \
  --minConfidence 0.7

# Get recent lessons
npx claude-flow memory recent \
  --limit 5 \
  --sort byConfidence

# Get by tags
npx claude-flow memory tagSearch \
  --tags ["performance", "nextjs"] \
  --limit 10
```

### Promote to Skill
```bash
# Automatically promote high-confidence lessons
npx claude-flow memory promote \
  --domain "code-quality" \
  --minConfidence 0.85 \
  --auto true

# Manual promotion
npx claude-flow memory promote \
  --lessonId "lesson-abc123" \
  --toSkill "nextjs-performance-best-practices"
```

### Cross-Session Context
```bash
# Load memory from previous session
npx claude-flow memory load \
  --session "2026-09-20" \
  --domain "all"

# Sync memory across machines (federation)
npx claude-flow memory sync \
  --remote "https://federation.ruv.io" \
  --pull \
  --push
```

## Memory Types

### Pattern Memories
- Successful code patterns
- Anti-patterns to avoid
- Performance optimizations
- Security best practices

### Context Memories
- Project-specific configurations
- Environment variables
- API endpoints
- Database schemas

### Lesson Memories
- "What worked well"
- "What to avoid next time"
- "Quick wins discovered"
- "Gotchas learned"

## Auto-Learning Triggers

Memory automatically captures lessons when:
- Task completes successfully ✓
- Error patterns detected ✗
- Performance improves significantly
- Security issues resolved
- User provides explicit feedback

**Configuration (.claude/memory-config.json):**
```json
{
  "autoCapture": true,
  "minSuccessRate": 0.6,
  "retentionDays": 365,
  "maxLessonsPerDomain": 100,
  "encryptionAtRest": true,
  "federationEnabled": false
}
```

## Best Practices

1. **Store immediately** after learning - don't wait
2. **Tag comprehensively** - use 3-5 relevant tags per lesson
3. **Set realistic confidence** - overconfidence reduces usefulness
4. **Review weekly** - purge low-confidence or obsolete lessons
5. **Federate selectively** - only share high-value patterns across orgs
6. **Respect privacy** - strip PII before storing cross-organization
7. **Version your memories** - track which model version generated each lesson
8. **Domain isolation** - keep memories separated by project type