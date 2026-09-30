---
name: nexu-skill-catalog
description: >-
  Nexu Skill Catalog Skill - Discover, register, and manage skills from
  the nexu-io/open-design repository. Central skill discovery and registration.
---

# Nexu Skill Catalog Skill

Purpose: Discover, register, and manage skills from the nexu-io/open-design
repository. Central skill discovery and registration point for all available
design and agent skills.

## Skill Discovery

### How Skills Are Discovered

Skills are discovered through multiple channels:

1. **GitHub Registry** - Automatic discovery from `https://github.com/nexu-io/open-design`
2. **Local Skills Directory** - Skills installed in `~/.config/opencode/skills/`
3. **Upstream Protocols** - Skills from upstream repositories (e.g., `@ibelick/ui-skills`)
4. **DESIGN.md Registration** - Explicit registration in project DESIGN.md files

### Skill Metadata

Each skill in the catalog contains:

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Skill identifier | `minimalist-ui` |
| `description` | Human-readable description | `Clean editorial-style interfaces` |
| `triggers` | Search trigger phrases | `minimalist ui`, `ui constraints` |
| `od` | OpenDesign protocol metadata | `mode: prototype`, `category: design-systems` |
| `upstream` | Source repository | `https://github.com/ibelick/ui-skills` |
| `category` | Skill category | `design-systems`, `ui-design`, `marketing` |

### Discovery Commands

```bash
# List all discovered skills
npx claude-flow skill list --catalog nexu

# Search skills by trigger
npx claude-flow skill search --trigger "minimalist ui"

# Register a new skill
npx claude-flow skill register --name minimalist-ui --source nexu-io

# Update skill catalog
npx claude-flow skill update-catalog --source nexu-io/open-design
```

## Registration System

### Register Skill in PROJECT

Add to DESIGN.md:

```markdown
# DESIGN.md

## Registered Skills

- `nexu-minimalist-ui`: Premium Utilitarian Minimalism protocol
- `nexu-ui-constraints`: UI constraints catalog  
- `nexu-marketing-psychology`: Conversion-focused design
- `nexu-design-protocols`: Comprehensive design protocols

## Active Protocol

Current: `minimalist-ui` (Premium Utilitarian Minimalism)
```

### Global Registration

Skills can be registered globally in the OpenCode configuration:

```json
{
  "skills": {
    "autoRegister": ["nexu-minimalist-ui", "nexu-ui-constraints"],
    "globalCatalog": "https://api.nexu.io/skill-catalog"
  }
}
```

## Skill Categories

| Category | Description | Example Skills |
|----------|-------------|----------------|
| `design-systems` | Comprehensive design system protocols | `design-protocols`, `ui-constraints` |
| `ui-design` | UI-specific design patterns | `minimalist-ui`, `ui-guidelines` |
| `marketing` | Conversion-focused design | `marketing-psychology`, `persuasion-patterns` |
| `component-libs` | Reusable component specifications | `component-specs`, `grid-system` |
| `visual-design` | Color, typography, imagery | `color-palette`, `typography-system` |

## Cross-Skill References

Skills can reference each other through:

- **Upstream references**: `upstream: "https://github.com/ibelick/ui-skills"`
- **Depends on**: `depends: ["nexu-ui-constraints"]`
- **Compatible with**: `compatible: ["nexu-minimalist-ui"]`
- **Conflicts with**: `conflicts: ["legacy-ui-skill"]`

## Version Management

| Version | Status | Action |
|---------|--------|--------|
| `v1.0.0` | Stable | No action required |
| `v1.x.y` | Minor updates | Review changelog, optional update |
| `v0.x.y` | Development | Test in staging before production |
| Deprecated | Removed | Remove from DESIGN.md, replace with alternative |

## Integration with OpenCode

The skill catalog integrates with OpenCode's skill system:

1. **Auto-discovery** - Skills are auto-discovered on first run
2. **Version pinning** - Skills can be version-pinned in configuration
3. **Conflict resolution** - Conflicting skills are flagged for review
4. **Dependency tracking** - Skill dependencies are tracked and resolved

## Triggers

- `skill catalog`
- `discover skills`
- `register skill`
- `manage skills`
- `open-design skills`