---
name: ruflo-swarm-coordinator
description: >-
  Ruflo Swarm Coordinator - specialized skill for orchestrating multi-agent swarms
  with intelligent topology selection, agent deployment, and performance monitoring.
---

# Ruflo Swarm Coordinator Skill

Purpose: Orchestrate intelligent multi-agent swarms following ruflo's coordination patterns.

## Topology Selection Matrix

| Task Complexity | Recommended Topology | Max Agents | Use Case |
|-----------------|---------------------|------------|----------|
| Simple (1-2 agents) | star | 3 | Focused single-objective tasks |
| Moderate (3-5 agents) | hierarchical | 6 | Complex projects with clear roles |
| Large (5-8 agents) | mesh | 8 | Collaborative problem-solving |
| Enterprise (8+ agents) | ring | 12 | Sequential processing workflows |

## Agent Deployment Patterns

### Hierarchical (Queen-Led)
```
Queen (Coordinator)
├─ Worker 1: Coder
├─ Worker 2: Reviewer
├─ Worker 3: Tester
├─ Worker 4: Researcher
└─ Worker 5: Documentation
```

### Mesh (Peer-to-Peer)
```
Agent A (Coder) ↔ Agent B (Reviewer) ↔ Agent C (Tester)
         ↑                  ↑
       Agent D          Agent E
       (Architect)      (Designer)
```

### Ring (Sequential)
```
Agent 1 → Agent 2 → Agent 3 → Agent 4 → Agent 1
(Analysis)   (Design)   (Implementation)   (Validation)
```

## Swarm Lifecycle Management

### Initialize
```bash
npx claude-flow swarm init \
  --topology hierarchical \
  --maxAgents 5 \
  --strategy balanced \
  --name "project-alpha-swarm"
```

### Deploy Agents
```bash
# Spawn specialized agents
npx claude-flow agent spawn --type coder --name "alpha-coder-1"
npx claude-flow agent spawn --type reviewer --name "alpha-reviewer-1"
npx claude-flow agent spawn --type tester --name "alpha-tester-1"
npx claude-flow agent spawn --type researcher --name "alpha-researcher-1"
npx claude-flow agent spawn --type planner --name "alpha-planner-1"
```

### Orchestrate Tasks
```bash
npx claude-flow task orchestrate \
  --task "Implement user authentication" \
  --strategy parallel \
  --maxAgents 3 \
  --priority high
```

### Monitor & Scale
```bash
# Check swarm status
npx claude-flow swarm status --id "project-alpha-swarm"

# Dynamic scaling based on workload
npx claude-flow swarm scale \
  --targetAgents 7 \
  --metric "task queue depth" \
  --threshold 10
```

### Destroy
```bash
npx claude-flow swarm destroy \
  --id "project-alpha-swarm" \
  --graceful true
```

## Quality Standards

- **Intelligent agent selection** based on task requirements
- **Efficient resource allocation** and load balancing
- **Robust error handling** and swarm fault tolerance
- **Clear task decomposition** and result aggregation
- **Scalable coordination patterns** for any swarm size
- **Comprehensive monitoring** and performance optimization