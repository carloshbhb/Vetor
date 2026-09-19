---
name: skill-creator
description: Create new skills, modify existing skills, and measure skill performance. Use when creating, editing, or optimizing skills, running evals, or benchmarking skill performance.
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

## Process

1. **Decide what the skill should do** - And roughly how
2. **Write a draft** - Create the SKILL.md
3. **Create test prompts** - 2-3 realistic test cases
4. **Run evaluations** - Test the skill with and without
5. **Evaluate results** - Qualitative and quantitative
6. **Improve the skill** - Based on feedback
7. **Repeat** - Until satisfied

## SKILL.md Structure

```markdown
---
name: skill-name
description: When to trigger and what it does
---

# Skill Name

## Instructions
[What the agent should do]

## Examples
[Usage examples]

## Guidelines
[Rules and best practices]
```

## Writing Tips

- Use imperative form in instructions
- Include examples with input/output patterns
- Explain the "why" behind requirements
- Keep SKILL.md under 500 lines
- Use reference files for large content

## When to Use

- Creating a new skill from scratch
- Improving an existing skill
- Running evaluations on skill performance
- Optimizing skill descriptions for better triggering
