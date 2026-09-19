---
name: tdd
description: Test-driven development with red-green-refactor loop. Use when building features or fixing bugs test-first, or when integration tests are needed.
---

# Test-Driven Development

TDD is the red → green loop. This skill makes that loop produce tests worth keeping.

## Core Principles

### What a good test is

Tests verify behavior through public interfaces, not implementation details. A good test reads like a specification: "user can checkout with valid cart" tells you exactly what capability exists, and it survives refactors.

### Seams: where tests go

A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** Before writing any test, confirm the seams with the user.

Ask: "What's the public interface, and which seams should we test?"

### Anti-patterns

- **Implementation-coupled**: mocks internal collaborators, tests private methods
- **Tautological**: the assertion recomputes the expected value the way the code does
- **Horizontal slicing**: writing all tests first, then all implementation

## Rules of the loop

1. **Red before green.** Write the failing test first, then only enough code to pass it.
2. **One slice at a time.** One seam, one test, one minimal implementation per cycle.
3. **Refactoring is not part of the loop.** It belongs to the review stage.

## When to Use

- Building new features
- Fixing bugs
- When user mentions "test-first" or "red-green-refactor"
- When integration tests are needed
