---
name: nexu-design-protocols
description: >-
  Nexu Design Protocols Skill - Comprehensive design system protocols
  following nexu-io/open-design patterns for consistent design output.
---

# Nexu Design Protocols Skill

Purpose: Comprehensive design system protocols following nexu-io/open-design
patterns for consistent, high-quality design output across all agent interactions.

## Protocol Structure

Following the open-design skills-protocol.md format, protocols follow a
three-part structure:

1. **Base format** (unchanged from Claude Code)
2. **OD extensions** (optional, nexu-io specific)
3. **Skill discovery & precedence**
4. **Registry modes**
5. **The DESIGN.md as skill context**

## Protocol Categories

### UI Design Protocols

| Protocol Name | Description | Trigger Phrases |
|--------------|-------------|----------------|
| `minimalist-ui` | Warm monochrome, editorial typography, bento grids | `minimalist ui`, `editorial product UI` |
| `ui-constraints` | Opinionated constraints for consistency | `ui constraints`, `ui guide` |
| `design-system` | Comprehensive design system protocols | `design system`, `system protocols` |

### Visual Design Protocols

| Protocol Name | Description | Trigger Phrases |
|--------------|-------------|----------------|
| `color-palette` | Warm monochrome + spot pastels system | `color palette`, `warm monochrome` |
| `typography-system` | Editorial serif + geometric sans-serif | `typography`, `font system` |
| `motion-design` | Subtle micro-animations, invisible motion | `motion`, `animations`, `micro-interactions` |

### Component Protocols

| Protocol Name | Description | Trigger Phrases |
|--------------|-------------|----------------|
| `component-specs` | Bento grids, buttons, badges, accordions | `components`, `grid layout`, `button style` |
| `iconography` | Phosphor/Radix icons, continuous-line illustrations | `icons`, `illustration` |
| `image-optimization` | Desaturated photography, warm grain overlays | `images`, `photography`, `optimization` |

## Skill Discovery & Precedence

When multiple protocols could apply, the following precedence rules:

1. **Most specific protocol wins** - e.g., `minimalist-ui` overrides `ui-constraints`
2. **Latest registered protocol** - newer protocols take precedence over older
3. **Explicit invocation** - `invoke skill: minimalist-ui` overrides auto-discovery
4. **Fallback chain** - if no protocol matches, default to base design guidelines

## Registry Modes

| Mode | Description | Usage |
|------|-------------|-------|
| `prototype` | Default mode for skill discovery | Most skills use this mode |
| `design-system` | Full design system protocols | When building complete designs |
| `constraints-only` | Only constraint rules, no protocol | Quick constraint checks |

## DESIGN.md Integration

Skills can reference a PROJECT's DESIGN.md file for skill context. When a
repository contains a DESIGN.md, the skill system automatically:

1. Reads the DESIGN.md for registered skills
2. Merges protocol rules with DESIGN.md constraints
3. Priorilizes explicitly registered skills over auto-discovered ones
4. Maintains skill precedence across sessions

**Example DESIGN.md registration:**
```markdown
# DESIGN.md

## Registered Skills

- `nexu-minimalist-ui`: Premium Utilitarian Minimalism protocol
- `nexu-ui-constraints`: UI constraints catalog
- `nexu-design-protocols`: Comprehensive design protocols

## Active Protocol

Current: `minimalist-ui` (Premium Utilitarian Minimalism)