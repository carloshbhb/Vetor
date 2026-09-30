---
name: ruflo-native-integration
description: >-
  Ruflo Native Integration - pre-built integrations with Claude Code, Codex, and
  Hermes with auto-detection, seamless skill installation, and provider-aware
  model routing.
---

# Ruflo Native Integration Skill

Purpose: Seamless integration between OpenCode and major AI coding assistants
(Claude Code, Codex CLI, Hermes) following ruflo's integration patterns.

## Auto-Detection

### Project Type Detection

The integration auto-detects your project type and recommends the optimal setup:

| Detected Project | Recommended Integration | Skills Installed |
|-----------------|------------------------|------------------|
| `next.js` + `app router` | Claude Code | `ruflo-swarm-coordinator`, `ruflo-adaptive-memory` |
| `create-react-app` | Codex CLI | `ruflo-rag-integration`, `agent-swarm` |
| `svelte-project` | Hermes | `ruflo-federation`, `agentdb-vector-search` |
| `python-project` | Multi-model | All three integrations |
| `mixed-tech-stack` | Adaptive | Context-aware selection |

**Detection Command:**
```bash
npx claude-flow integrate --auto-detect
```

**Example Output:**
```
✓ Detected Next.js project with app router
✓ Recommended: Claude Code integration
✓ Installing: ruflo-swarm-coordinator, ruflo-adaptive-memory
✓ Configuring: skill aliases, memory persistence
✓ Setting up: RAG index for codebase
✓ Ready in 10 seconds
```

## Claude Code Integration

### Setup
```bash
# Initialize Claude Code integration
npx claude-flow integrate --target claude-code

# Or auto-detect and setup
npx claude-flow integrate --auto-detect
```

### Features Enabled

| Feature | Description |
|---------|-------------|
| Skill Auto-Install | Automatically installs ruflo skills from npm |
| Swarm Orchestration | Spawn agents via `npx claude-flow agent spawn` |
| Memory Persistence | Stores lessons across Claude Code sessions |
| RAG Integration | Semantic search over your codebase |
| Federation | Coordinate with other Claude Code instances |
| Skill Aliases | Shortcuts like `/swarm`, `/memory`, `/rag` |

### Usage Examples

**Spawn a Swarm:**
```bash
# Initialize swarm
claude-flow swarm init --topology hierarchical --agents 5

# Spawn specialized agents
claude-flow agent spawn --type coder --name "auth-coder"
claude-flow agent spawn --type reviewer --name "auth-reviewer"
claude-flow agent spawn --type tester --name "auth-tester"

# Start orchestrated task
claude-flow task orchestrate --task "Implement JWT auth" --strategy parallel
```

**Store and Retrieve Memories:**
```bash
# Learn from a task completion
claude-flow memory store \
  --lesson "JWT auth implemented using HS256 algorithm" \
  --confidence 0.9 \
  --domain "authentication" \
  --tags ["jwt", "security", "nextjs"] \
  --evidence "Used @auth0/jwt package, tested with 500+ requests"

# Retrieve for future tasks
claude-flow memory search \
  --query "JWT implementation" \
  --domain "authentication" \
  --minConfidence 0.7
```

**RAG Search Over Codebase:**
```bash
# Search for patterns in your codebase
claude-flow rag search \
  --query "error handling patterns" \
  --searchMode hybrid \
  --topK 5 \
  --includeMetadata true

# Results will show:
# - Matching code snippets
# - File paths and line numbers
# - Confidence scores
# - Related tags
```

### Configuration (.claude/claude-integration.json)
```json
{
  "target": "claude-code",
  "autoInstallSkills": true,
  "memory": {
    "autoCapture": true,
    "retentionDays": 365,
    "federationEnabled": false
  },
  "rag": {
    "enabled": true,
    "indexPath": ".claude/rag-index",
    "model": "nvidia/nv-embed-v1",
    "autoChunk": true
  },
  "swarm": {
    "defaultTopology": "hierarchical",
    "maxAgents": 5,
    "autoOrchestrate": true
  }
}
```

## Codex CLI Integration

### Setup
```bash
# Initialize Codex integration
npx claude-flow integrate --target codex-cli

# Or using Codex CLI directly
codex integrate --ruflosetup
```

### Features Enabled

| Feature | Description |
|---------|-------------|
| Skill Marketplace | Access ruflo skills via Codex skill store |
| Agent Deployment | Deploy agents to Codex cloud or local |
| Code Indexing | Index repository for semantic search |
| Task Automation | Automate common development tasks |
| Plugin Ecosystem | Extend with Codex plugins |

### Usage Examples

**Deploy Agents:**
```bash
# Deploy coder agent to handle feature
codex agent deploy --type coder --feature "user-profiles"

# Deploy reviewer for code quality
codex agent deploy --type reviewer --standards "eslint, prettier"
```

**Index Code for RAG:**
```bash
# Index entire repository
codex rag index --path ./ --model "nvidia/nv-embed-v1"

# Search indexed code
codex rag search \
  --query "authentication best practices" \
  --limit 10
```

**Task Automation:**
```bash
# Auto-generate boilerplate
codex automate --task "Create API route with validation"

# Run tests
codex automate --task "Fix failing tests, report results"
```

### Configuration (.codex/ruflosettings.json)
```json
{
  "target": "codex-cli",
  "skillsEnabled": true,
  "agentDeployment": "local",  // or "cloud"
  "rag": {
    "enabled": true,
    "chunkStrategy": "semantic",
    "maxChunkSize": 512
  },
  "autoIndex": true
}
```

## Hermes Integration

### Setup
```bash
# Initialize Hermes integration
npx claude-flow integrate --target hermes

# Or via Hermes CLI
hermes setup --ruflosupport
```

### Features Enabled

| Feature | Description |
|---------|-------------|
| Distributed Memory | Share memories across Hermes instances |
| Federated Coordination | Coordinate agents across Hermes deployments |
| Lightweight RAG | Optimized for edge/device deployment |
| Protocol Translation | AG-UI to Hermes-specific protocols |
| Resource Optimization | Minimal memory footprint |

### Usage Examples

**Federated Memory:**
```bash
# Sync memory with other Hermes instances
hermes memory sync \
  --pull \
  --remote "hermes1.company.com" \
  --remote "hermes2.company.com"

# Share learned patterns across team
hermes memory share \
  --pattern "performance-optimization" \
  --team "backend-team" \
  --encrypted true
```

**Lightweight RAG:**
```bash
# Edge-optimized search (smaller index)
hermes rag search \
  --query "caching strategy" \
  --model "sentence-transformers/all-MiniLM-L6-v2" \
  --lightweight true

# Results returned quickly for device constraints
```

**Agent Coordination:**
```bash
# Deploy agent mesh across Hermes instances
hermes agent mesh \
  --topology star \
  --center "hermes-primary" \
  --nodes "hermes-worker-1,hermes-worker-2"

# Distribute tasks across mesh
hermes task distribute \
  --task "Process 1000 documents" \
  --meshId "doc-processing" \
  --strategy "round-robin"
```

### Configuration (.hermes/rufo-config.yaml)
```yaml
target: hermes
memory:
  distributed: true
  federation: true
  encryption: true
rag:
  enabled: true
  lightweight: true
  model: "sentence-transformers/all-MiniLM-L6-v2"
swarm:
  defaultTopology: mesh
  maxAgents: 8
  resourceLimits:
    maxMemory: "512MB"
    maxCPU: "1.0"
```

## Cross-Platform Skill Aliases

| Action | Claude Code | Codex CLI | Hermes |
|--------|-------------|-----------|--------|
| Initialize swarm | `claude-flow swarm init` | `codex agent deploy --type coder` | `hermes agent mesh` |
| Store memory | `claude-flow memory store` | `codex memory add` | `hermes memory share` |
| RAG search | `claude-flow rag search` | `codex rag query` | `hermes rag search` |
| Spawn agent | `claude-flow agent spawn` | `codex agent spawn` | `hermes agent spawn` |
| Federation status | `claude-flow federation status` | `codex federation status` | `hermes federation status` |

## Provider-Aware Model Routing

### Model Selection by Task

| Task Type | Recommended Provider | Model |
|-----------|---------------------|-------|
| Code generation | OpenAI / NVIDIA | `gpt-4o`, `nvidia/nv-code-editing-v1` |
| Code analysis | Anthropic / NVIDIA | `claude-3-opus`, `nvidia/nv-embed-v1` |
| Semantic search | NVIDIA / OpenAI | `nvidia/nv-embed-v1`, `text-embedding-3-small` |
| Reasoning | Anthropic | `claude-3.5-sonnet` |
| Creative writing | Google / OpenAI | `gemini-1.5-pro`, `gpt-4o` |
| Classification | Google | `gemini-1.5-flash` |
| Summarization | OpenAI / Anthropic | `gpt-4o-mini`, `claude-3-haiku` |

### Routing Configuration
```json
{
  "modelRouting": {
    "codeGeneration": {
      "primary": "openai/gpt-4o",
      "fallback": "anthropic/claude-3-opus",
      "costOptimized": "openai/gpt-4o-mini"
    },
    "semanticSearch": {
      "primary": "nvidia/nv-embed-v1",
      "fast": "sentence-transformers/all-MiniLM-L6-v2",
      "highQuality": "BAAI/bge-large-en"
    },
    "reasoning": {
      "primary": "anthropic/claude-3-5-sonnet",
      "balanced": "openai/gpt-4o-mini"
    }
  },
  "costTracking": true,
  "budgetAlerts": {
    "monthlyBudgetUSD": 100,
    "alertThreshold": 0.8
  }
}
```

## Best Practices

1. **Always auto-detect first** - let the system recommend the right integration
2. **Enable skill auto-install** - ensures you have all ruflo capabilities
3. **Configure model routing** - balance quality vs cost for your use case
4. **Persist memories** - don't lose lessons across sessions
5. **Use hybrid RAG** - always combine semantic + keyword search
6. **Respect federation boundaries** - don't coordinate across orgs unnecessarily
7. **Monitor cost** - set budget alerts to avoid surprise charges
8. **Version your integrations** - track which model versions you've tested
9. **Test with real queries** - synthetic data may not reflect real usage
10. **Document your setup** - configuration files are portable across machines