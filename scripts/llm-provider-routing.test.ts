import assert from "node:assert/strict";
import {
  buildLLMProviderOrder,
  OPENROUTER_FREE_MODEL_PRIORITY,
  rankOpenRouterFreeModels,
} from "../src/lib/llm-provider";

const freeCatalog = [
  {
    id: "google/gemma-4-26b-a4b-it:free",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
  {
    id: "google/gemma-4-31b-it:free",
    pricing: { prompt: 0, completion: 0 },
    architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] },
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
  {
    id: "thinkingmachines/inkling:free",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
  {
    id: "google/gemma-4-31b-it",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
  {
    id: "google/gemma-4-31b-it:free",
    pricing: { prompt: "0.000001", completion: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  },
  {
    id: "google/gemma-4-31b-it:free",
    pricing: { prompt: "0", completion: "0" },
    architecture: { input_modalities: ["image"], output_modalities: ["image"] },
  },
];

assert.deepEqual(
  rankOpenRouterFreeModels(freeCatalog),
  [
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
  ],
  "only curated, currently free text-in/text-out models should be returned in priority order"
);

assert.ok(
  !OPENROUTER_FREE_MODEL_PRIORITY.includes("thinkingmachines/inkling:free" as never),
  "the soon-to-be-retired Inkling free endpoint must not be selected"
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

console.log("LLM provider routing tests passed");
