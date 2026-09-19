---
name: improve-codebase-architecture
description: Scan a codebase for deepening opportunities, present them as a visual HTML report, then explore whichever one you pick. Use when looking for architectural improvements.
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities**: refactors that turn shallow modules into deep ones.

## Process

### 1. Explore

- Walk commit history to find hot spots (files that keep changing)
- Read `CONTEXT.md` for domain vocabulary
- Check ADRs in `docs/adr/`
- Look for:
  - Modules where understanding requires bouncing between many small files
  - Shallow modules (interface nearly as complex as implementation)
  - Tightly-coupled modules leaking across seams
  - Untested or hard-to-test code

### 2. Present candidates

For each candidate, document:
- **Files**: which files/modules are involved
- **Problem**: why the current architecture causes friction
- **Solution**: what would change
- **Benefits**: improved testability and maintainability
- **Recommendation strength**: Strong / Worth exploring / Speculative

### 3. Explore the chosen candidate

Once the user picks a candidate, explore:
- Constraints and dependencies
- The shape of the deepened module
- What tests would survive
- Domain model impacts

## When to Use

- Codebase feels hard to navigate
- Tests are difficult to write
- Changes require touching many files
- Onboarding new developers is slow
