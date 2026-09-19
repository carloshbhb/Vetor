---
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when debugging something broken, throwing, failing, or slow.
---

# Diagnosing Bugs

A discipline for hard bugs. Skip phases only when explicitly justified.

## Phase 1: Build a feedback loop

**This is the skill.** Everything else is mechanical.

Build a tight pass/fail signal for the bug:
1. Failing test at whatever seam reaches the bug
2. Curl / HTTP script against a running dev server
3. CLI invocation with fixture input
4. Headless browser script (Playwright / Puppeteer)
5. Replay a captured trace
6. Throwaway harness
7. Property / fuzz loop
8. Bisection harness
9. Differential loop
10. HITL bash script (last resort)

### Tighten the loop

- Make it faster
- Make the signal sharper
- Make it more deterministic

### Completion criterion

A tight loop that goes red:
- [ ] Red-capable: drives the actual bug code path
- [ ] Deterministic: same verdict every run
- [ ] Fast: seconds, not minutes
- [ ] Agent-runnable: can run unattended

## Phase 2: Reproduce + minimise

- Confirm the loop produces the failure mode the user described
- Shrink the repro to the smallest scenario that still goes red
- Cut inputs, callers, config, data, and steps one at a time

## Phase 3: Hypothesise

Generate 3–5 ranked hypotheses before testing any.

Each hypothesis must be falsifiable:
> "If <X> is the cause, then <changing Y> will make the bug disappear"

Show the ranked list to the user before testing.

## Phase 4: Instrument

- Debugger / REPL inspection (preferred)
- Targeted logs at boundaries that distinguish hypotheses
- Tag every debug log with a unique prefix

## Phase 5: Fix + regression test

Write the regression test before the fix (if a correct seam exists).

## Phase 6: Cleanup

- [ ] Original repro no longer reproduces
- [ ] Regression test passes
- [ ] All debug instrumentation removed
- [ ] Throwaway prototypes deleted

## When to Use

- User says "diagnose" or "debug this"
- Something is broken, throwing, failing, or slow
- Performance regressions
