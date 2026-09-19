---
name: code-review
description: Review changes along two axes: Standards (coding standards) and Spec (issue requirements). Use when reviewing a branch, PR, or work-in-progress changes.
---

# Code Review

Two-axis review of changes since a fixed point:

- **Standards**: Does the code follow documented coding standards?
- **Spec**: Does the code faithfully implement the originating issue/spec?

## Process

### 1. Pin the fixed point

Use the commit SHA, branch name, tag, or `main` as the comparison point.

```bash
git diff <fixed-point>...HEAD
git log <fixed-point>..HEAD --oneline
```

### 2. Identify the spec source

Look for:
1. Issue references in commit messages (#123, Closes #45)
2. Spec files under `docs/`, `specs/`, or `.scratch/`
3. Ask the user if not found

### 3. Review along both axes

**Standards axis** checks:
- Code follows documented conventions
- No Fowler code smells (Duplicated Code, Feature Envy, Primitive Obsession, etc.)
- Proper naming, structure, and organization

**Spec axis** checks:
- Requirements from the spec are implemented
- No scope creep (unasked-for behavior)
- Implementation matches the intent

### 4. Report findings

Present findings under `## Standards` and `## Spec` headings separately.

End with: total findings per axis, and the worst issue within each axis.

## When to Use

- Before merging a PR
- Reviewing work-in-progress
- When user asks to "review since X"
- After implementing a feature
