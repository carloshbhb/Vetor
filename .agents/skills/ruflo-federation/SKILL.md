---
name: ruflo-federation
description: >-
  Ruflo Federation - distributed agent coordination across multiple machines/orgs
  with mTLS, PII stripping, and secure inter-agent communication.
---

# Ruflo Federation Skill

Purpose: Enable distributed multi-agent coordination across machines and organizations
following ruflo's federation patterns with security and privacy by design.

## Federation Topologies

| Topology | Description | Max Nodes | Use Case |
|----------|-------------|-----------|----------|
| Mesh | Peer-to-peer, all nodes equal | 16 | Decentralized swarms, no single point of failure |
| Hierarchical | Queen-led with regional leaders | 64 | Large orgs with departmental boundaries |
| Star | Central coordination node | 20 | Focused projects, tight control |
| Ring | Sequential passing | 12 | Workflow pipelines, sequential processing |

## Security Model

### mTLS (mutual TLS)
- Every agent presents a client certificate
- Every agent validates peer certificates
- Certificates rotated every 30 days
- Revocation list enforcement

### PII Stripping
Automatic removal of personal identifiable information before inter-agent communication:
- Email addresses → hashed values
- Names → initials + UUID fragment
- API keys → prefix-only display (sk-****)
- User IDs → anonymized tokens

**Configuration (.claude/federation-config.json):**
```json
{
  "enabled": true,
  "topology": "mesh",
  "mtls": {
    "certPath": ".claude/agent-cert.pem",
    "keyPath": ".claude/agent-key.pem",
    "caPath": ".claude/ca-cert.pem",
    "autoRotate": true,
    "rotationIntervalDays": 30
  },
  "piiStripping": {
    "enabled": true,
    "hashAlgorithm": "sha256",
    "safeModes": ["email", "name", "apiKey", "userId"]
  },
  "peers": [
    "agent-1.ruv.io",
    "agent-2.ruv.io", 
    "agent-3.ruv.io"
  ],
  "federationKey": "ruflo-federation-v1"
}
```

## Federation Commands

### Register Agent
```bash
npx claude-flow federation register \
  --name "my-agent" \
  --org "my-organization" \
  --capabilities "coder,reviewer" \
  --mtls true \
  --registerWith "https://federation.ruv.io"
```

### Sync with Peers
```bash
# Pull latest state from federation
npx claude-flow federation sync \
  --pull \
  --strategy "incremental"

# Push local state to federation
npx claude-flow federation sync \
  --push \
  --strategy "full"

# Status check
npx claude-flow federation status \
  --listPeers \
  --checkHealth
```

### Discover Agents
```bash
# Find agents with specific capabilities
npx claude-flow federation discover \
  --capabilities "tester" \
  --topology mesh \
  --limit 5

# Get overall federation health
npx claude-flow federation health \
  --checkLatency \
  --checkIntegrity
```

### Unregister Agent
```bash
npx claude-flow federation unregister \
  --name "my-agent" \
  --reason "project completed"
```

## Federation Protocols

### AG-UI (Agent Graphical User Interface)
- Standardized message format for inter-agent communication
- Supports streaming and batch modes
- Built-in retry and fallback logic
- Schema versioning (v1.0, v1.1, v2.0)

### Message Format
```json
{
  "type": "task_orchestrate",
  "source": "agent-uuid",
  "target": "agent-uuid", 
  "payload": {
    "task": "Build user auth",
    "priority": "high",
    "context": { ... }
  },
  "metadata": {
    "ttl": 300,  // seconds
    "replyTo": "agent-uuid",
    "correlationId": "unique-id"
  }
}
```

## Best Practices

1. **Start with mesh topology** for most use cases - best balance of resilience and performance
2. **Enable mTLS by default** - security first approach
3. **Strip PII automatically** - privacy compliance by default
4. **Use incremental sync** - reduces bandwidth and conflict risk
5. **Monitor federation health** - set up alerts for node failures
6. **Respect federation boundaries** - don't force cross-org coordination
7. **Rotate credentials regularly** - automate certificate rotation
8. **Document peer relationships** - maintain a federation map
9. **Test failover scenarios** - regularly verify mesh resilience
10. **Respect node capacity** - don't overload regional nodes in hierarchical setups