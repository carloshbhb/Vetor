import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildLLMProviderOrder,
  OPENROUTER_FREE_MODEL_PRIORITY,
  getGroqRequestPolicy,
  rankOpenRouterFreeModels,
} from "../src/lib/llm-provider";

const freeCatalog = [
  {
    id: "dots-studio/dots-3-note-preview:free",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] },
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    pricing: { prompt: 0, completion: 0 },
    architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] },
  },
  {
    id: "nvidia/nemotron-3.5-super-vl:free",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text", "image", "video"], output_modalities: ["text"] },
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
  {
    id: "google/gemma-4-31b-it:free",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] },
  },
  {
    id: "thinkingmachines/inkling:free",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    pricing: { prompt: "0.000001", completion: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
];

assert.deepEqual(
  rankOpenRouterFreeModels(freeCatalog),
  [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3.5-super-vl:free",
    "dots-studio/dots-3-note-preview:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  ],
  "only account-verified, zero-cost text models that passed the free-model smoke test should be returned in priority order"
);

assert.ok(
  !OPENROUTER_FREE_MODEL_PRIORITY.includes("thinkingmachines/inkling:free" as never),
  "the soon-to-be-retired Inkling free endpoint must not be selected"
);
assert.ok(
  !OPENROUTER_FREE_MODEL_PRIORITY.includes("google/gemma-4-31b-it:free" as never),
  "a public model blocked by this account's policy must not be selected"
);
assert.ok(
  !OPENROUTER_FREE_MODEL_PRIORITY.includes("nvidia/nemotron-3.5-lightning:free" as never),
  "a free endpoint that repeatedly returns no final response must not be selected"
);

assert.deepEqual(
  getGroqRequestPolicy("qwen/qwen3.8-27b", 2600),
  { maxTokens: 900, minimumIntervalMs: 60_000 },
  "Qwen output must stay below the observed 1000-token-per-minute ceiling"
);
assert.deepEqual(
  getGroqRequestPolicy("openai/gpt-oss-120b", 2600),
  { maxTokens: 1_300, minimumIntervalMs: 60_000 },
  "GPT-OSS output must be bounded and paced under the observed Groq TPM ceiling"
);
assert.deepEqual(
  getGroqRequestPolicy("other/model", 2600),
  { maxTokens: 2600, minimumIntervalMs: 30_000 },
  "unknown Groq models keep caller output budgets with a conservative pacing interval"
);
assert.deepEqual(
  buildLLMProviderOrder(true, true, true),
  ["openrouter", "groq", "nvidia"],
  "fallback order must be OpenRouter, then Groq, then NVIDIA"
);
assert.deepEqual(
  buildLLMProviderOrder(false, true, true),
  ["groq", "nvidia"],
  "Groq remains the first fallback when OpenRouter is not configured"
);
assert.deepEqual(
  buildLLMProviderOrder(false, false, true),
  ["nvidia"],
  "NVIDIA remains the final available fallback"
);

const llmProviderSource = readFileSync("src/lib/llm-provider.ts", "utf8");
assert.match(llmProviderSource, /'nvidia\/nemotron-3\.5-lightning-30b-a3b'/);
assert.doesNotMatch(llmProviderSource, /'nvidia\/llama-3\.1-nemotron-ultra-253b-v1'/);

console.log("LLM provider routing tests passed");
