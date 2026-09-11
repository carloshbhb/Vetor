---
name: engenharia-pro
description: Supreme engineering agent — software architecture, AI/LLM systems, autonomous execution, security/governance. Use for complex codebase refactoring, performance optimization, CI/CD, agent orchestration, RAG systems, prompt engineering, TDD, DevSecOps, or any task requiring deep engineering judgment across the full stack.
---

# Engenharia Pro

Master-level engineering skill covering the full spectrum: systems architecture, AI/LLM engineering, autonomous tool use, and security governance. This is the "do everything correctly" agent.

## 1. Advanced Software Engineering & Systems Architecture

### Repo-Wide Reasoning
- **Before touching any code**: map the dependency graph. Read imports, trace abstractions, identify cross-module coupling. Never edit in isolation.
- **AST-level understanding**: When refactoring, think in terms of abstract syntax trees — what nodes change, what remains, what breaks downstream.
- **Monorepo navigation**: For this repo (Next.js 14 + Supabase + Remotion + Vercel):
  - `app/` → Route handlers and pages (Next.js App Router)
  - `lib/` → Shared business logic (db, prompts, video, SEO, AI providers)
  - `components/` → React UI components
  - `remotion/` → Video composition (Remotion v4)
  - `scripts/` → CI/CD workers (video-worker-ci, remotion-worker)
  - `tests/` → Vitest test suites
  - `.opencode/` → Agent/skill definitions
  - `.github/workflows/` → GitHub Actions CI

### Refactoring & Design Patterns
- **SOLID**: Single Responsibility (one function = one job), Open/Closed (extend via config, not modification), Liskov (subtypes must be substitutable), Interface Segregation (small focused interfaces), Dependency Inversion (depend on abstractions).
- **Pragmatic patterns**: Apply patterns ONLY when the problem demands it. Over-engineering is worse than no pattern. YAGNI > DRY > SOLID in priority.
- **Clean Architecture**: Business logic in `lib/` is the core. `app/` (routes) and `components/` (UI) are adapters. Never let UI depend on database directly — always go through `lib/`.

### Advanced Debugging & Root Cause Analysis
1. **Reproduce first**: Write a failing test that captures the bug. If you can't reproduce, you can't fix.
2. **Read the stack trace**: Every line matters. Identify the first frame in YOUR code (not library code).
3. **Binary search the cause**: Comment out half the code path. Does the bug persist? Narrow down.
4. **Log strategically**: Add targeted logs at decision points, not everywhere. Use structured logging.
5. **Fix the root cause, not the symptom**: If a value is wrong, find WHERE it becomes wrong, not where it's used.

### Performance Engineering
- **CPU bottlenecks**: Profile with `--prof` (Node.js), identify hot paths. Optimize algorithms (O(n²) → O(n log n)), not micro-optimizations.
- **Memory leaks**: Track object retention. Common in Node.js: unclosed streams, event listener accumulation, global caches without TTL.
- **I/O optimization**: Batch database calls, use connection pooling, implement request coalescing for repeated reads.
- **SQL/NoSQL**: Add indexes for frequently queried columns. Use `EXPLAIN ANALYZE` before optimizing. Avoid N+1 queries (use JOINs or batch loading).
- **Data structures**: Choose wisely — Map vs Object, Set vs Array, LinkedList vs Array based on access patterns.

### DevOps, CI/CD & IaC
- **GitHub Actions**: This repo uses workflows for video pipeline (`video-daily.yml`). Understand `needs`, `if`, matrix strategies, caching, artifact passing.
- **Docker**: Multi-stage builds for small images. Non-root user. Health checks. Layer caching for dependencies.
- **Kubernetes**: Deployment → Service → Ingress. ConfigMaps for env, Secrets for credentials. Resource limits are mandatory.
- **Terraform/Pulumi**: State management, drift detection, modular composition, import existing resources.

## 2. AI, LLMs & Prompt Engineering (AI Native)

### Agent Architecture & Orchestration
- **Frameworks**: LangGraph (state machines), CrewAI (role-based), AutoGen (multi-agent debate). Choose based on task complexity.
- **State management**: Persistent state across agent steps. Checkpointing for long-running tasks. Human-in-the-loop for critical decisions.
- **Reflection loops**: Agent generates → self-critiques → regenerates. Minimum 2 iterations for quality-critical outputs.
- **Error recovery**: If agent fails, fall back to simpler approach. Never loop infinitely on the same error.

### RAG Systems (Retrieval-Augmented Generation)
- **Chunking strategy**: Semantic chunking > fixed-size. Overlap 10-20% between chunks. Metadata-rich chunks (title, section, timestamp).
- **Vector stores**: Pinecone (managed), Qdrant (self-hosted), Supabase pgvector (already in this repo's stack).
- **Re-ranking**: Cross-encoder re-ranker after initial retrieval. Reduces hallucination by 40-60%.
- **Hallucination mitigation**: Always cite sources. Use "According to [source]..." format. Validate claims against retrieved context.
- **Query expansion**: HyDE (Hypothetical Document Embeddings) for better retrieval of nuanced queries.

### Fine-Tuning & Model Optimization
- **LoRA/QLoRA**: Low-rank adaptation for fine-tuning large models on consumer hardware. QLoRA adds 4-bit quantization.
- **Quantization**: GGUF (llama.cpp), EXL2 (ExLlamaV2), GPTQ. Trade accuracy for speed/memory. 4-bit is usually acceptable.
- **Alignment**: DPO (Direct Preference Optimization) > RLHF for simpler implementation. Use human preference data.
- **Inference optimization**: vLLM (PagedAttention), Ollama (local), TensorRT-LLM (NVIDIA). Batch requests where possible.

### Prompt Engineering & Metaprompting
- **Chain-of-Thought (CoT)**: Force step-by-step reasoning. "Let's think step by step" improves math/logic by 30-50%.
- **Tree of Thoughts (ToT)**: Explore multiple reasoning paths, evaluate each, choose best. For complex problems.
- **Few-Shot**: Provide 2-3 examples of desired output format. More examples = more consistency, but diminishing returns past 5.
- **Structured outputs**: Use JSON Schema / TypeChat to enforce output format. Never trust free-form JSON from LLMs without validation.
- **Metaprompting**: Prompt that generates/refines other prompts. Use for optimizing prompts at scale.

## 3. Execution Autonomy & Tool Use

### Deterministic Tool Use
- **Bash execution**: Always quote variables, handle errors, use `set -e` in scripts. Check exit codes. Never pipe without error handling.
- **API calls**: Validate response status before parsing body. Handle rate limits (429), server errors (5xx), and network failures gracefully.
- **File operations**: Read before write. Validate paths exist. Use atomic writes (write to temp, rename). Never overwrite without confirmation.
- **Database interactions**: Use parameterized queries (never string interpolation). Wrap in transactions for multi-step operations.

### Autonomous TDD (Test-Driven Development)
1. **Red**: Write a failing test that describes the desired behavior.
2. **Green**: Write the minimum code to make the test pass.
3. **Refactor**: Clean up while keeping tests green.
4. **Repeat**: Run full test suite after each cycle. Never stop at "it works locally."
5. **Coverage**: Target 80%+ for business logic, 60%+ overall. 100% is aspirational, not mandatory.

### UI/Frontend Inspection
- **Playwright/Puppeteer**: Screenshot visual regression, check accessibility (axe-core), validate responsive layouts.
- **Visual testing**: Capture screenshots at key states, compare with baselines. Flag pixel differences > threshold.
- **Accessibility**: WCAG 2.1 AA minimum. ARIA labels, keyboard navigation, color contrast, screen reader compatibility.

## 4. Security, Governance & Quality

### DevSecOps & Code Security
- **OWASP Top 10**: Sanitize all user input. Use parameterized queries. Validate/escape output. CSRF tokens on forms. Secure headers (CSP, HSTS).
- **SQL Injection**: NEVER concatenate user input into SQL. Use parameterized queries or ORMs. This applies to Supabase queries too.
- **XSS**: Sanitize HTML output. Use `dangerouslySetInnerHTML` only with trusted content. Content-Security-Policy headers.
- **Secrets management**: NEVER commit secrets. Use env vars, GitHub Secrets, or secret managers. Scan git history for accidentally committed keys.
- **Dependency auditing**: Run `npm audit` regularly. Update vulnerable packages. Use `npm audit fix --force` cautiously.

### Prompt Injection Defense
- **Direct injection**: User input contains instructions that override system prompt. Mitigate: separate user content from system instructions with clear delimiters.
- **Indirect injection**: Malicious content in retrieved documents. Mitigate: scan retrieved content for injection patterns before passing to LLM.
- **Guardrails**: NeMo Guardrails, Llama Guard, or custom regex filters for input/output validation.
- **Output validation**: Verify LLM output matches expected schema before execution. Never execute LLM-generated code without review.

### FinOps for AI (LLM Cost Management)
- **Token mapping**: Track input/output tokens per request. Set hard limits on max_tokens.
- **Caching**: Cache identical/similar prompts. This repo uses `lib/agentCache.ts` — leverage it.
- **Model routing**: Use cheap models (GPT-4o-mini, Haiku) for simple tasks, expensive models (GPT-4o, Opus) only for complex reasoning.
- **Latency optimization**: Stream responses where possible. Set timeout limits. Implement circuit breakers for slow providers.
- **Cost monitoring**: Log token usage per request. Alert on anomalies (sudden cost spike = possible infinite loop or prompt injection).

## 5. Implementation for This Repo

### Architecture Patterns
- **Route handlers** (`app/api/`): Thin controllers. Delegate to `lib/` functions. Return consistent JSON shapes.
- **Business logic** (`lib/`): Pure functions where possible. Side effects isolated to specific modules (db, ai, video).
- **Database** (`lib/db.ts`): Supabase client. Use typed queries. Never raw SQL without parameterization.
- **AI providers** (`lib/ai.ts`): Abstraction over Gemini, Groq, OpenRouter. Fallback chain with circuit breaker.
- **Video pipeline** (`scripts/`): Stateless workers. All state in Supabase (`video_jobs` table). Idempotent operations.

### Code Quality Gates
After every change:
1. `npx tsc --noEmit` — TypeScript strict mode
2. `npx vitest run` — All tests pass
3. `npm run build` — Production build succeeds (if applicable)
4. No secrets in diff (check before commit)
5. No new `any` types without justification
6. No new `console.log` in production code (use structured logging)
