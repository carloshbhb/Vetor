import assert from "node:assert/strict";
import { getVideoScriptGenerationBudget } from "../src/lib/script-generator";

const budget = getVideoScriptGenerationBudget();
assert.equal(budget.timeoutMs, 27_000);
assert.equal(budget.deadlineMs, 51_000);
assert.equal(budget.maxAttemptsPerModel, 1);
assert.ok(
  budget.deadlineMs - budget.timeoutMs - 7_000 >= 15_000,
  "the primary model must leave enough time for a real NVIDIA fallback attempt"
);
assert.ok(
  budget.deadlineMs < 60_000,
  "generation budget must finish before the Vercel route execution limit"
);

console.log("script generator fallback budget tests passed");
