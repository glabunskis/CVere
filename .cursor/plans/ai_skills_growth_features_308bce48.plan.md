---
name: AI skills growth features
overview: "Add three career-relevant capabilities to CVere: pgvector RAG (vacancy-to-CV matching + semantic CV search), LLM observability/eval (Langfuse + eval harness), and Playwright E2E tests. Each doubles as a real product feature and an honest resume line."
todos:
  - id: playwright
    content: "Add Playwright: config, npm scripts, Supabase auth setup, and a core-flow spec (login -> dashboard -> chat message -> preview) against the mock model."
    status: pending
  - id: rag-migration
    content: "Migration: enable pgvector, add embedding column to job_description, add cv_chunk table + HNSW index + owner-scoped RLS; regenerate Supabase types."
    status: pending
  - id: rag-embed
    content: Add embedding helper wrapping @ai-sdk/openai; populate embeddings on CV and vacancy insert/update.
    status: pending
  - id: rag-tools
    content: Add read-only chat tools matchVacancyToCvs and searchCvContent; register in the chat tool registry and update the system prompt.
    status: pending
  - id: obs-langfuse
    content: Add env-gated instrumentation.ts with LangfuseSpanProcessor; confirm existing telemetry metadata flows through.
    status: pending
  - id: eval-harness
    content: Add scripts/eval/ runner with a graded prompt set using the MockLanguageModelV3 seam.
    status: pending
isProject: false
---

# CVere: RAG, Observability, and E2E Testing

Outline (non-detailed) plan for three skill-growth features. All respect the "chat is the only AI surface" rule in [AGENTS.md](AGENTS.md): retrieval is exposed as chat tools, not new AI endpoints.

## Recommended order

1. Playwright E2E — zero external cost, guards flows the RAG work will touch.
2. pgvector RAG — the headline skill.
3. Langfuse + eval — cheapest last; telemetry hook already exists.

## 1. pgvector RAG (highest priority)

Two connected features, both surfaced as chat tools:
- Vacancy to CV matching: rank which CV variant best fits a pasted vacancy, by meaning.
- Semantic search over CV content: retrieve the most relevant past bullets/projects when tailoring.

```mermaid
flowchart LR
  Text["CV bullets / vacancy text"] --> Embed["embed (text-embedding-3-small)"]
  Embed --> PG["pgvector column"]
  Query["chat tool query"] --> QEmbed["embed query"]
  QEmbed --> PG
  PG --> Ranked["nearest matches (cosine)"]
  Ranked --> Agent["chat agent reasons over results"]
```

Outline:
- Migration: `create extension vector`; add `embedding vector(1536)` to `job_description` (see [supabase/migrations/20260509120000_cv_domain.sql](supabase/migrations/20260509120000_cv_domain.sql):270); new `cv_chunk` table (id, cv_id, user_id, kind, ref_id, content, embedding); HNSW index; owner-scoped RLS mirroring existing policies. Run `npm run generate-types`.
- Embedding infra: shared helper wrapping `@ai-sdk/openai` embeddings under `src/shared/api/ai/`; reuse existing `OPENAI_API_KEY`. Populate embeddings on CV/vacancy insert and update.
- Retrieval tools: `matchVacancyToCvs({jobDescriptionId})` and `searchCvContent({query})` added to the existing tool registry wired in [src/app/api/chat/route.ts](src/app/api/chat/route.ts):189 (a new `src/features/chat/tools/rag-tools.ts`, exported via the feature barrel). Read-only, owner-enforced, not in `MUTATING_TOOLS`.
- System prompt: teach the agent when to retrieve.

Resume line: "RAG with pgvector: semantic vacancy-to-CV matching and retrieval-augmented tailoring, exposed as agent tools."

## 2. LLM observability + eval

Observability outline:
- Add `instrumentation.ts` (Next.js) with a Langfuse `LangfuseSpanProcessor`, env-gated (`LANGFUSE_*`); no-op when unset.
- `experimental_telemetry` is already enabled on `streamText` with `userId`/`sessionId` metadata ([src/app/api/chat/route.ts](src/app/api/chat/route.ts):232), so no route changes beyond confirming metadata.

Eval outline:
- Add a runner under `scripts/eval/` with a small graded prompt set (asserts: never invents facts, emits valid tool calls, confirms before destructive actions).
- Use the existing `MockLanguageModelV3` seam in [src/shared/api/ai/chat-model.ts](src/shared/api/ai/chat-model.ts) for deterministic CI runs.

Resume line: "LLM observability (Langfuse) + eval harness for the chat agent."

## 3. Playwright E2E

Outline:
- Add Playwright + config + npm scripts (greenfield; none in [package.json](package.json) yet).
- Auth setup: test user / stored session for Supabase auth.
- First spec: login -> dashboard loads -> send a chat message -> assert streamed response + preview updates. Point chat at the mock model for determinism.
- Later: extend to CV edit + library flows; optional CI wiring.

Resume line: "End-to-end tests (Playwright) covering the core authenticated flow."

## Notes / decisions still open

- Embeddings reuse `OPENAI_API_KEY` (`text-embedding-3-small`, negligible cost) vs a local model — plan assumes OpenAI reuse.
- RAG v1 depth: both matching + search, or matching only — plan assumes both; can trim to matching-only for a leaner first cut.