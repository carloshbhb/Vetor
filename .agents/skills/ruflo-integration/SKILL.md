---
name: ruflo-integration
description: >-
  Ruflo integration skill - brings The original agent harness capabilities to OpenCode.
  Provides multi-player swarm coordination, adaptive memory, federation, vector RAG
  integration, and native Claude Code / Codex / Hermes integration patterns.
---

# Ruflo Integration Skill

Purpose: Bridge The original agent harness (ruvnet/ruflo) capabilities with OpenCode's agent framework.

## Core Features

### 1. Multi-Player Swarm Coordination
Deploy and manage specialized agent swarms with intelligent orchestration.

**Capabilities:**
- Initialize swarms with hierarchical, mesh, ring, or star topologies
- Spawn specialized agents (coder, reviewer, tester, planner, researcher)
- Distribute tasks across agent pools
- Monitor swarm health and performance

**Usage:**
```bash
npx claude-flow swarm init --topology hierarchical --agents 5
npx claude-flow agent spawn --type coder --name my-coder
npx claude-flow task orchestrate --task "Build authentication"
```

### 2. Adaptive Memory & Self-Learning
Persistent memory system that captures lessons, patterns, and instincts across sessions.

**Capabilities:**
- Store successful patterns with confidence scoring
- Extract insights from completed tasks
- Promote lessons into reusable skills/commands
- Prevent cross-project contamination

**Usage:**
```bash
npx claude-flow memory store --lesson " learned pattern" --confidence 0.9
npx claude-flow memory promote --domain code-quality
```

### 3. Federation Support
Coordinate agents across multiple machines/orgs with mTLS and PII stripping.

**Capabilities:**
- Register agents in distributed federation
- Sync state across machines
- Secure inter-agent communication
- Cross-organizational swarm deployment

**Usage:**
```bash
npx claude-flow federation register --name my-agent
npx claude-flow federation sync --remote all
```

### 4. Vector RAG Integration
Semantic search and retrieval-augmented generation pipeline.

**Capabilities:**
- Index documents with HNSW for 150x faster search
- Hybrid search (dense + sparse vectors)
- Model migration without downtime
- Persistent memory across sessions

**Usage:**
```bash
npx claude-flow rag index --docs ./knowledge-base
npx claude-flow rag search --query "how to optimize SQL"
```

### 5. Native Integration Hooks
Pre-built integrations with Claude Code, Codex, and Hermes.

**Capabilities:**
- Auto-detect project type and skill stack
- Seamless skill installation from npm
- Cross-harness context persistence
- Provider-aware model routing

**Usage:**
```bash
npx claude-flow integrate --target claude-code
npx claude-flow integrate --target codex-cli
npx claude-flow integrate --target hermes
```

## Agent Types (100+ Specialized)

Following ruflo's extensive agent library:

**Core Development:**
- `coder`, `reviewer`, `tester`, `planner`, `researcher`

**V3 Specialized:**
- `security-architect`, `security-auditor`, `memory-specialist`, `performance-engineer`

**Swarm Coordination:**
- `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`

**GitHub Operations:**
- `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

**SPARC Methodology:**
- `sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

**AgentDB Systems:**
- `agentdb-advanced`, `agentdb-learning`, `agentdb-memory-patterns`, `agentdb-optimization`, `agentdb-vector-search`

## Commands Overview

| Category | Command |
|----------|---------|
| Swarm Init | `npx claude-flow swarm init --topology <type> --maxAgents <n>` |
| Agent Spawn | `npx claude-flow agent spawn --type <type> --name <name>` |
| Memory Store | `npx claude-flow memory store --lesson <text> --confidence <n>` |
| Rag Index | `npx claude-flow rag index --docs <path>` |
| Federation | `npx claude-flow federation <register|sync|status>` |
| Skill Install | `npx skills add ruvnet/ruflo --skill <name> --yes` |

## Best Practices

1. **Use hierarchical topology** for coordination across 5+ agents
2. **Keep agent count under 8** for tight coordination efficiency
3. **Use specialized agents** for specific tasks (don't genericize)
4. **Coordinate via memory**, not direct communication
5. **Promote lessons learned** into reusable skills after each task
6. **Federate selectively** - not all agents need cross-machine capabilities
7. **Cache RAG results** - vector search is powerful but can be expensive
8. **Version your memory** - track which model/context generated each lesson