---
name: nexu-ui-constraints
description: >-
  Nexu UI Constraints Skill - Opinionated constraints for interface generation
  following nexu-io/open-design patterns. Maintains consistency across UI pieces.
---

# Nexu UI Constraints Skill

Purpose: Provide opinionated, evolving constraints to guide agents when building
interfaces, ensuring consistency across many small UI pieces following
nexu-io/open-design patterns.

## What It Does

Curated set of opinionated constraints useful for keeping output coherent
across many small UI pieces. This skill catalogs design system rules
that can be discovered during planning and invoked by name (`ui-constraints`)
or with trigger phrases.

## Source

- Upstream: https://github.com/nexu-io/open-design (skills/ui-skills)
- Category: `design-systems`
- Mode: `design-system`

## How to Use

This skill catalogs constraints that help agents maintain design consistency.
To use the full upstream workflow, reference the original assets at
https://github.com/ibelick/ui-skills.

Then invoke this skill by name (`nexu-ui-constraints`) or with trigger phrases:

### Trigger Phrases

- `ui constraints`
- `ui guide`
- `opinionated ui`
- `ui rules`

## Core Constraints

### Color Constraints

| Constraint | Value | Description |
|------------|-------|-------------|
| Primary background | `#FFFFFF` or `#F7F6F3` | Warm bone/off-white preferred |
| Structural borders | `#EAEAEA` | Ultra-light gray for all dividers |
| Text color (body) | `#111111` or `#2F3437` | Off-black/charcoal, never pure `#000000` |
| Secondary text | `#787774` | Muted gray for secondary information |

### Typography Constraints

| Constraint | Value | Description |
|------------|-------|-------------|
| Heading font | `'Lyon Text', 'Newsreader', 'Playfair Display', serif` | Editorial serif for headings |
| Body font | `'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif` | Clean geometric sans-serif |
| Monospace font | `'Geist Mono', 'SF Mono', 'JetBrains Mono', monospace` | For code and keystrokes |
| Letter-spacing (tight) | `-0.02em` to `-0.04em` | On headings for editorial feel |
| Line-height (tight) | `1.1` | On heading text |

### Component Constraints

| Component | Constraint |
|-----------|------------|
| Cards | `border: 1px solid #EAEAEA`, padding `24px` to `40px` |
| Buttons (primary) | Background `#111111`, text `#FFFFFF`, border-radius `4px` to `6px`, no box-shadow |
| Buttons (hover) | Hover state: `#333333` or `transform: scale(0.98)` |
| Badges | Pill-shaped (`border-radius: 9999px`), `text-xs`, uppercase, `letter-spacing: 0.05em` |
| Accordions | `border-bottom: 1px solid #EAEAEA`, no container boxes, `+`/`-` toggle icons |
| Keystrokes (`<kbd>`) | `border: 1px solid #EAEAEA`, `border-radius: 4px`, `background: #F7F6F3`, monospace font |

### Motion & Animation Constraints

| Animation | Constraint |
|-----------|------------|
| Scroll entry | `translateY(12px)` + `opacity: 0` over `600ms`, `cubic-bezier(0.16, 1, 0.3, 1)`, `IntersectionObserver` |
| Hover states | `box-shadow` transition from `0 0 0` to `0 2px 8px rgba(0,0,0,0.04)` over `200ms`, or `scale(0.98)` on `:active` |
| Staggered reveals | `animation-delay: calc(var(--index) * 80ms)` |
| Background motion | Optional: slow radial gradient blob, `animation-duration: 20s+`, `opacity: 0.02-0.04`, `position: fixed; pointer-events: none` |
| Performance | Animate exclusively via `transform` and `opacity`. No layout-triggering properties. |

### Negative Constraints (Banned)

- ❌ DO NOT use "Inter", "Roboto", or "Open Sans" typefaces
- ❌ DO NOT use generic icon libraries (Lucide, Feather, Heroicons)
- ❌ DO NOT use Tailwind default heavy drop shadows
- ❌ DO NOT use primary colored backgrounds for large sections
- ❌ DO NOT use gradients, neon colors, or 3D glassmorphism
- ❌ DO NOT use `rounded-full` for large containers/buttons
- ❌ DO NOT use emojis in code/markup/text/alt text
- ❌ DO NOT use AI copywriting clichés ("Elevate", "Seamless", "Unleash", etc.)
- ❌ DO NOT use generic placeholders ("John Doe", "Acme Corp", "Lorem Ipsum")

## Execution Checklist

When writing frontend code or designing a layout, verify:

- [ ] Macro-whitespace established (massive vertical padding between sections)
- [ ] Typography content width constrained (`max-w-4xl` or `max-w-5xl`)
- [ ] Custom typographic hierarchy applied immediately
- [ ] All cards/dividers/borders follow `1px solid #EAEAEA` rule
- [ ] Scroll-entry animations added to major content blocks
- [ ] Sections have visual depth (imagery, gradients, textures — no empty flat backgrounds)
- [ ] Code reflects the editorial aesthetic natively, no manual adjustments needed

## Triggers

- `ui constraints`
- `ui guide`
- `opinionated ui`
- `ui rules`