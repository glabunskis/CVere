---
name: pgvector rag
overview: "Add pgvector-backed RAG to CVere as two read-only chat tools: matchVacancyToCvs (rank CV variants against a saved vacancy) and searchCvContent (semantic search over CV bullets/projects), keeping \"chat is the only AI surface.\""
todos:
  - id: phase-1-schema
    content: "Migration: enable pgvector, add job_description.embedding, create cv_chunk table + HNSW cosine indexes + owner RLS + updated_at trigger, and the match_cv_chunks / match_vacancy_to_cvs security-invoker functions; regenerate Supabase types."
    status: pending
  - id: phase-2-embeddings
    content: Add shared embedding helper (text-embedding-3-small, env-gated with dev fallback) and reindexCvChunks; hook re-indexing into renderAndUploadCv and populate vacancy embedding on ingestJobDescription.
    status: pending
  - id: phase-3-tools
    content: Add read-only chat tools matchVacancyToCvs and searchCvContent with schemas, register them (mutates:false), export via the chat barrel, spread into the route tools object, and update the system prompt.
    status: pending
isProject: false
---

# CVere: pgvector RAG (vacancy-to-CV matching + semantic CV search)

Implement the first feature of [.cursor/plans/ai_skills_growth_features_308bce48.plan.md](.cursor/plans/ai_skills_growth_features_308bce48.plan.md): pgvector retrieval exposed as two read-only chat tools. Split into three phases matching the parent plan's `rag-migration`, `rag-embed`, `rag-tools` todos.

## Goal

The chat agent can (1) rank the user's CV variants by semantic fit to a saved vacancy and (2) semantically search CV content (bullets, projects, etc.) to inform tailoring. Retrieval is backed by Postgres `pgvector`: a `vector(1536)` column on `job_description` and a new owner-scoped `cv_chunk` table with an HNSW cosine index, queried through two `security invoker` SQL functions. Embeddings use OpenAI `text-embedding-3-small` (reusing `OPENAI_API_KEY`). CV chunks are re-indexed at the shared CV edit boundary (`renderAndUploadCv`), with a lazy "index-if-empty" fallback in the tools for CVs/vacancies never re-rendered since launch. No new AI HTTP endpoint; the two tools are added to the existing chat tool registry, read-only, owner-enforced, and excluded from `MUTATING_TOOLS`.

## Context / key facts

- Chat route and tool wiring: [src/app/api/chat/route.ts](src/app/api/chat/route.ts). Tools are assembled into one flat `tools` object inside `createUIMessageStream(...).execute` (around line 189) by spreading `build*Tools(user, activeCvRef)` helpers. New tools are added by spreading another builder there.
- Tool registry: [src/features/chat/tools/tool-registry.ts](src/features/chat/tools/tool-registry.ts) is the source of truth; [src/features/chat/tools/mutating-tools.ts](src/features/chat/tools/mutating-tools.ts) derives `MUTATING_TOOLS` from entries with `mutates: true`. Read-only tools must be registered with `mutates: false`.
- Existing read-only tool pattern to mirror: [src/features/chat/tools/vacancy-tools.ts](src/features/chat/tools/vacancy-tools.ts) (`buildVacancyTools`, `VACANCY_TOOL_NAMES`), which queries `job_description` scoped by `user.id` via the RLS server client and returns plain objects.
- Chat feature barrel: [src/features/chat/index.ts](src/features/chat/index.ts) re-exports every `build*Tools`/`*_TOOL_NAMES`. New tools must be exported here and imported by the route through this barrel.
- Tool input schemas live in [src/features/chat/schemas.ts](src/features/chat/schemas.ts) (Zod, each field `.describe()`d). The route imports them via the barrel.
- System prompt: [src/features/chat/system-prompt.ts](src/features/chat/system-prompt.ts) (`CHAT_SYSTEM_PROMPT`). Update the "Tool groups" and vacancy-editing sections to teach when to retrieve.
- OpenAI wiring pattern: [src/shared/api/ai/chat-model.ts](src/shared/api/ai/chat-model.ts) uses `createOpenAI({ apiKey, baseURL })` from `@ai-sdk/openai` (already a dependency, `^3.0.63`), reads `OPENAI_API_KEY`/`OPENAI_BASE_URL`, and falls back to a `MockLanguageModelV3` in dev/test when the key is missing (throws only in production). The embedding helper must follow the same env-gating + dev fallback shape.
- CV data shapes: [src/entities/cv/cv-snapshot.ts](src/entities/cv/cv-snapshot.ts) defines `AiProfile` and `buildCvSnapshot(cv, children)`. [src/entities/cv/get-cv-children.ts](src/entities/cv/get-cv-children.ts) reads ordered section rows. `AiProfile` fields to chunk: `summary`, `experience[]` (role/company + `bullets[]` + `stack[]`), `projects[]` (name/description + `bullets[]` + `stack[]`), `skills[]`, `education[]`, `certifications[]`, `languages[]`.
- Shared CV edit boundary: [src/entities/cv/render.tsx](src/entities/cv/render.tsx) `renderAndUploadCv({ user, cvId })` already loads the CV row + children and builds the snapshot before rendering. It is invoked from chat (route `onFinish`), profile editor, cv-style, cv-history, cv-import, and achievements (confirmed via usages). This is the single re-index hook point.
- CV read helpers (entities/cv barrel [src/entities/cv/index.ts](src/entities/cv/index.ts)): `listCvRows(userId)`, `getSelectedCv(userId)`, `getCvChildren(cvId)`, `buildCvSnapshot`, `renderAndUploadCv`, `AiProfile`.
- Vacancy insert path: [src/features/vacancies/job-actions.ts](src/features/vacancies/job-actions.ts) `ingestJobDescription` inserts a `job_description` row (`raw_text`, optional `company`/`role`). There is no vacancy update action (only insert + delete), so vacancy embedding only needs populating on insert (plus a lazy fallback for legacy rows).
- DB conventions (from [supabase/migrations/20260509120000_cv_domain.sql](supabase/migrations/20260509120000_cv_domain.sql) and [supabase/migrations/20260525114000_unify_cv_model.sql](supabase/migrations/20260525114000_unify_cv_model.sql)): every public table has `user_id uuid not null references auth.users on delete cascade`, `enable row level security`, a single `owner full access` policy `using (auth.uid() = user_id) with check (auth.uid() = user_id)`, and a `set_updated_at` trigger via the shared `public.set_updated_at()` function. Sections are keyed by `cv_id` (with `on delete cascade`). No migration currently runs `create extension vector`.
- Migration + types workflow: `npm run migration:new <name>` scaffolds a file under `supabase/migrations/`; `npm run migration:up` runs `supabase migration up --linked` then `npm run generate-types` (writes [src/shared/api/supabase/types.ts](src/shared/api/supabase/types.ts)). Both require `.env.local` and a linked Supabase project (project id `vjklhmtexivjfxzpsciz` is already in [package.json](package.json)).
- Admin client exists ([src/shared/api/supabase/supabase-admin.ts](src/shared/api/supabase/supabase-admin.ts)) but is only for webhooks/trusted ops. All RAG reads/writes happen in authenticated request contexts, so use the RLS server client (`createSupabaseServerClient`).
- `tsx` is available as a devDependency (usable if any one-off script is ever needed, but this plan needs none).
- Unknown: whether the linked Supabase Postgres has `pgvector` available to enable. Supabase projects support it via `create extension vector`; the executor should confirm the migration applies without error and stop if the extension cannot be created.

## Decisions already made

- Embedding model: OpenAI `text-embedding-3-small`, 1536 dimensions, reusing `OPENAI_API_KEY` (and optional `OPENAI_BASE_URL`). Do not add a new env var for the model name; hard-code `text-embedding-3-small`.
- Env gating: the embedding helper mirrors `chat-model.ts` — real embeddings when `OPENAI_API_KEY` is set; a deterministic dev/test fallback (return fixed-length zero vectors, dimension 1536) when the key is absent and `NODE_ENV !== 'production'`; throw a configured error in production when the key is missing. This keeps `npm run build`/lint working without secrets. Vector search over zero vectors returns arbitrary-but-stable ordering in dev, which is acceptable.
- Population strategy: re-index a CV's `cv_chunk` rows at the shared edit boundary inside `renderAndUploadCv` (best-effort: log and swallow embedding failures so a rendering never fails because of RAG). Plus a lazy "index-if-empty" fallback inside the retrieval tools for CVs that have zero chunks yet, and vacancy embedding backfill when a vacancy's `embedding` is null. No separate backfill migration or script.
- Re-index write shape: delete all existing `cv_chunk` rows for the `cv_id`, then insert the freshly computed chunks in one batch. Simplest and correct at this scale.
- Distance metric: cosine (`vector_cosine_ops`, `<=>`). Report similarity to the model as `1 - distance`.
- `cv_chunk.kind` is free text constrained to: `summary`, `experience`, `project`, `skill`, `education`, `certification`, `language`. `ref_id uuid null` holds the source section row id (null for the summary chunk).
- Retrieval is exposed only as chat tools (`matchVacancyToCvs`, `searchCvContent`), read-only, owner-enforced, excluded from `MUTATING_TOOLS`, registered with `mutates: false`. No new HTTP route.
- Vacancy-to-CV ranking aggregates `cv_chunk` similarity per `cv_id` (no CV-level embedding column). The `match_vacancy_to_cvs` SQL function returns per-CV aggregate scores; there is no `cv.embedding` column.
- SQL query functions are `security invoker` so the caller's RLS applies and results are owner-scoped automatically. Do not use the admin client for RAG.
- Scope: both tools ship in v1.

## Conventions

- After code changes in any phase, run `npm run build` and `npm run lint` and fix any errors introduced.
- For the schema phase, apply the migration with `npm run migration:up` (runs the migration against the linked project and regenerates [src/shared/api/supabase/types.ts](src/shared/api/supabase/types.ts)). Do not hand-edit `types.ts`.
- Follow Feature-Sliced Design import direction (`views → widgets → features → entities → shared`); import slices through their `index.ts` barrels, never deep paths (except the documented deviations). New shared/entity code must be exported from the relevant barrel.
- Server-only modules must include `import 'server-only';`.
- TypeScript strict: no `any`; use `unknown` and narrow. Named exports only.
- RLS is mandatory on every new table. Mirror the existing "owner full access" policy exactly.
- Do not add comments that merely narrate code. Do not introduce a second AI entry point.
- When you need exact `@ai-sdk/openai` embedding API usage or the Supabase pgvector RPC pattern, consult the installed package docs / Context7 rather than guessing signatures.

## Phases

## Phase 1 - Schema, indexes, RLS, and query functions

Status: pending

Objective: Add all Postgres objects for RAG (pgvector extension, `job_description.embedding`, `cv_chunk` table + indexes + RLS + trigger, and the two query functions) in one migration, and regenerate Supabase types.

Files to touch:
- Create one migration file under `supabase/migrations/` (scaffold via `npm run migration:new add_rag_pgvector`).
- Regenerate [src/shared/api/supabase/types.ts](src/shared/api/supabase/types.ts) (via `npm run migration:up`; do not hand-edit).

Steps:
1. Scaffold the migration with `npm run migration:new add_rag_pgvector`.
2. In the migration, first enable the extension: `create extension if not exists vector with schema extensions;` (or the schema Supabase expects). Ensure later `vector(...)` type references resolve.
3. Add an embedding column to `job_description`: `embedding vector(1536)` nullable. Do not backfill in SQL (backfill happens lazily in the tool).
4. Create table `cv_chunk` with columns: `id uuid primary key default gen_random_uuid()`, `user_id uuid not null references auth.users on delete cascade`, `cv_id uuid not null references cv(id) on delete cascade`, `kind text not null`, `ref_id uuid null`, `content text not null`, `embedding vector(1536) null`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`. Add a check constraint restricting `kind` to the allowed set (summary, experience, project, skill, education, certification, language).
5. Enable RLS on `cv_chunk` and add a single policy `"cv_chunk owner full access" for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`, mirroring existing tables.
6. Add the shared updated-at trigger on `cv_chunk` using the existing `public.set_updated_at()` function (same pattern as other tables).
7. Add indexes: a b-tree index on `cv_chunk (user_id, cv_id)` for owner/CV filtering; an HNSW index on `cv_chunk (embedding vector_cosine_ops)`; and an HNSW index on `job_description (embedding vector_cosine_ops)`. Use `create index if not exists`.
8. Create SQL function `public.match_cv_chunks(query_embedding vector(1536), match_count int, filter_cv_id uuid default null)` as `language sql stable security invoker`. It selects from `cv_chunk`, optionally filtered by `filter_cv_id` when not null, orders by `embedding <=> query_embedding` ascending, limits to `match_count`, and returns `id, cv_id, kind, ref_id, content` plus `similarity` computed as `1 - (embedding <=> query_embedding)`. Rely on RLS for owner scoping (security invoker).
9. Create SQL function `public.match_vacancy_to_cvs(query_embedding vector(1536), per_cv_chunk_count int default 5)` as `language sql stable security invoker`. It ranks the caller's CVs by aggregate similarity: for each `cv_id`, take the top `per_cv_chunk_count` chunks by lowest cosine distance to `query_embedding`, average their `1 - distance` similarity, and return one row per `cv_id` with `cv_id` and `score`, ordered by `score` descending. Use a lateral/window approach; rely on RLS for owner scoping. (Consult the Supabase pgvector RPC docs for the exact aggregation pattern.)
10. Run `npm run migration:up`. Confirm it applies cleanly and regenerates `types.ts` with the new `cv_chunk` table types and the two functions under the generated `Functions` types.

Verification:
- `npm run migration:up` completes without error (extension created, table/indexes/policies/functions created, types regenerated).
- `npm run build` and `npm run lint` pass (only `types.ts` changed on the app side; it must type-check).
- `git diff src/shared/api/supabase/types.ts` shows a `cv_chunk` table entry and both function signatures.
- If `create extension vector` fails on the linked project, stop and report; do not work around it.

Dependencies: Existing schema (`cv`, `job_description`, section tables keyed by `cv_id`), the `public.set_updated_at()` function, and the `npm run migration:*` workflow with a linked project — all pre-existing.

## Phase 2 - Embedding helper and edit-boundary population

Status: pending

Objective: Add a shared embedding helper and a CV-chunk indexer, wire re-indexing into the shared CV render boundary, and populate the vacancy embedding on vacancy insert.

Files to touch:
- Create `src/shared/api/ai/embeddings.ts`.
- Create `src/entities/cv/cv-chunk-index.ts`.
- Edit [src/entities/cv/index.ts](src/entities/cv/index.ts) (export the new indexer).
- Edit [src/entities/cv/render.tsx](src/entities/cv/render.tsx) (call the indexer after upload).
- Edit [src/features/vacancies/job-actions.ts](src/features/vacancies/job-actions.ts) (embed on vacancy insert).

Steps:
1. In `src/shared/api/ai/embeddings.ts` (server-only): export an async helper that embeds one string and one that embeds many strings, returning `number[]` / `number[][]` of length 1536. Wrap `@ai-sdk/openai` embeddings (`embed` / `embedMany` from the `ai` package with `openai.textEmbeddingModel('text-embedding-3-small')`; consult the installed `@ai-sdk/openai` docs for exact API). Mirror `chat-model.ts` env gating: read `OPENAI_API_KEY`/`OPENAI_BASE_URL` via `createOpenAI`; when the key is missing and `NODE_ENV !== 'production'`, return deterministic zero vectors of length 1536 (no network); in production with a missing key, throw a small configured-error class (reuse the style of `ChatModelNotConfiguredError`). Export the embedding dimension constant (1536).
2. In `src/entities/cv/cv-chunk-index.ts` (server-only): export `reindexCvChunks({ user, cvId, snapshot? }: { user: User; cvId: string; snapshot?: AiProfile })`. If `snapshot` is not provided, load the CV row + `getCvChildren(cvId)` and build it with `buildCvSnapshot`. Convert the snapshot into an ordered list of `{ kind, ref_id, content }` chunks: one `summary` chunk (ref_id null) when summary is non-empty; one `experience` chunk per experience (content = role, company, location, dates, summary, joined bullets, and stack tags as readable text; ref_id = experience id); one `project` chunk per project (name, description, bullets, stack; ref_id = project id); one `skill` chunk per skill (name + category) OR a single grouped skills chunk — prefer per-row chunks with ref_id for precise retrieval; one chunk per education, certification, and language similarly. Skip chunks whose content is blank. Embed all chunk contents with the many-embedding helper, delete existing `cv_chunk` rows for `cvId` (scoped by `user.id`), then insert the new rows (`user_id`, `cv_id`, `kind`, `ref_id`, `content`, `embedding`) via the RLS server client. Export a name that reads well from the barrel.
3. Export `reindexCvChunks` from [src/entities/cv/index.ts](src/entities/cv/index.ts).
4. In [src/entities/cv/render.tsx](src/entities/cv/render.tsx) `renderAndUploadCv`, after the successful storage upload and `pdf_path` update, call `reindexCvChunks({ user, cvId, snapshot })` reusing the `snapshot` already built earlier in the function. Wrap it in try/catch: on failure, log via the shared logger and continue (never fail the render because of RAG). Keep it awaited so a subsequent search sees fresh chunks, but ensure a thrown embedding/db error is caught.
5. In [src/features/vacancies/job-actions.ts](src/features/vacancies/job-actions.ts) `ingestJobDescription`, after the insert returns the new row id, compute the embedding of `parsedInput.rawText` with the single-embedding helper and update the row's `embedding` column (scoped by `ctx.user.id`). Wrap in try/catch: log and continue on failure (the vacancy is still saved; the tool will backfill lazily).

Verification:
- `npm run build` and `npm run lint` pass.
- Manual/dev sanity (optional, if creds present): editing a CV through chat or the profile editor causes `cv_chunk` rows to appear/refresh for that `cv_id`; creating a vacancy sets its `embedding`. With no `OPENAI_API_KEY` in dev, the app still builds and edits still succeed (zero-vector fallback, no crash).
- No new AI HTTP endpoint was added.

Dependencies: Phase 1 (the `cv_chunk` table and `job_description.embedding` column exist in `types.ts`). Existing `renderAndUploadCv`, `buildCvSnapshot`, `getCvChildren`, `AiProfile`, and `ingestJobDescription` (all pre-existing).

## Phase 3 - Retrieval tools, registry, and system prompt

Status: pending

Objective: Add the two read-only chat tools, their input schemas, register them, wire them into the chat route, and update the system prompt to teach when to retrieve.

Files to touch:
- Create `src/features/chat/tools/rag-tools.ts`.
- Edit [src/features/chat/schemas.ts](src/features/chat/schemas.ts) (add input schemas).
- Edit [src/features/chat/tools/tool-registry.ts](src/features/chat/tools/tool-registry.ts) (register both tools, `mutates: false`).
- Edit [src/features/chat/index.ts](src/features/chat/index.ts) (export builder + tool names).
- Edit [src/app/api/chat/route.ts](src/app/api/chat/route.ts) (spread the builder into the `tools` object; import via barrel).
- Edit [src/features/chat/system-prompt.ts](src/features/chat/system-prompt.ts) (retrieval guidance).

Steps:
1. In [src/features/chat/schemas.ts](src/features/chat/schemas.ts), add `matchVacancyToCvsInputSchema` (`{ jobDescriptionId: z.uuid().describe(...) }`) and `searchCvContentInputSchema` (`{ query: z.string().min(1).max(500).describe(...), cvId: optionalCvIdSchema, limit: z.int().min(1).max(20).optional().describe(...) }`). Reuse the existing `optionalCvIdSchema`. Give every field a clear `.describe()`.
2. Create `src/features/chat/tools/rag-tools.ts` (server-only), exporting `buildRagTools(user: User, activeCv: ActiveCvRef)` and `RAG_TOOL_NAMES` (mirror `vacancy-tools.ts`). Both tools use `createSupabaseServerClient` and the embedding helper from `@/shared/api/ai/embeddings`.
   - `searchCvContent({ query, cvId, limit })`: resolve the target scope — if `cvId` provided use it, otherwise search across all the user's CVs (pass null `filter_cv_id`). Lazy fallback: if a specific `cvId` is targeted and it has zero `cv_chunk` rows, call `reindexCvChunks({ user, cvId })` first. Embed the query, call `supabase.rpc('match_cv_chunks', { query_embedding, match_count: limit ?? 8, filter_cv_id: cvId ?? null })`, and return a compact array of `{ cvId, kind, refId, content, similarity }`. Read-only; log via the shared logger.
   - `matchVacancyToCvs({ jobDescriptionId })`: load the vacancy row scoped by `user.id` (id, company, role, raw_text, embedding); throw if not found. Determine the query embedding: if the stored `embedding` is present use it, otherwise embed `raw_text` and backfill the column (best-effort). Lazy fallback: for each of the user's CVs (`listCvRows`) that has zero `cv_chunk` rows, call `reindexCvChunks` so newly-launched/legacy CVs are rankable. Call `supabase.rpc('match_vacancy_to_cvs', { query_embedding, per_cv_chunk_count: 5 })`, join CV titles from `listCvRows`, and return a ranked array of `{ cvId, title, score }` (highest first). Optionally, for the top-ranked CV, also call `match_cv_chunks` filtered to it to include a few example matching snippets so the agent can explain the match. Read-only.
   - Note: passing the query embedding to `.rpc(...)` follows Supabase's documented pgvector pattern (JS number array to a `vector` param). Consult the Supabase docs if PostgREST rejects the array.
3. In [src/features/chat/tools/tool-registry.ts](src/features/chat/tools/tool-registry.ts), add two entries under a new "RAG / Retrieval" comment: `{ name: 'matchVacancyToCvs', mutates: false, label: 'Match vacancy to CVs' }` and `{ name: 'searchCvContent', mutates: false, label: 'Search CV content' }`. Because `mutates: false`, they are automatically excluded from `MUTATING_TOOLS`.
4. In [src/features/chat/index.ts](src/features/chat/index.ts), export `buildRagTools` and `RAG_TOOL_NAMES` from `./tools/rag-tools`.
5. In [src/app/api/chat/route.ts](src/app/api/chat/route.ts): add `buildRagTools` to the existing import from `@/features/chat`, and spread `...buildRagTools(user, activeCvRef)` into the `tools` object inside `createUIMessageStream(...).execute` (alongside the other `build*Tools` spreads, e.g. after `buildVacancyTools`). No other route changes — the version-capture loop already skips non-mutating tools, and the dirty-CV logic only marks mutating tools.
6. In [src/features/chat/system-prompt.ts](src/features/chat/system-prompt.ts): add a short "Retrieval (read-only)" bullet to the "Tool groups" list describing `matchVacancyToCvs` and `searchCvContent`, and extend the "Vacancy-aware editing" section to instruct the agent to call `matchVacancyToCvs` when the user asks which CV best fits a vacancy, and to call `searchCvContent` to find the most relevant existing bullets/projects before tailoring. Reinforce that these tools only retrieve; they never invent facts.

Verification:
- `npm run build` and `npm run lint` pass.
- `MUTATING_TOOLS` does not contain `matchVacancyToCvs` or `searchCvContent` (they are `mutates: false`).
- Manual/dev sanity (if creds present): in chat, asking "which of my CVs best fits this vacancy?" triggers `matchVacancyToCvs` and returns a ranked list; asking to find relevant bullets triggers `searchCvContent`. Neither mutates a CV, and neither triggers an end-of-turn re-render/preview-dirty event.

Dependencies: Phase 1 (functions `match_cv_chunks`, `match_vacancy_to_cvs`, `cv_chunk` table, `job_description.embedding`) and Phase 2 (`embeddings` helper and `reindexCvChunks` exported from `@/entities/cv`). Existing tool-builder pattern (`vacancy-tools.ts`), registry, barrel, route wiring, and `listCvRows` — all pre-existing.

## Out of scope

- Feature 2 (Langfuse observability + eval harness) and Feature 3 (Playwright E2E) from the parent plan.
- Any new AI HTTP endpoint or non-chat AI surface.
- UI changes (no new pages/components/buttons); RAG is agent-tool-only.
- A CV-level embedding column on `cv`; ranking aggregates `cv_chunk` similarity instead.
- A standalone backfill migration/script for existing CVs/vacancies (handled lazily in the tools).
- Re-ranking models, hybrid keyword+vector search, chunk-size tuning, or cover-letter/interview matching.
- Adding a configurable embedding-model env var (model name is fixed to `text-embedding-3-small`).

## Handover log

<!--
Append one entry per completed phase using this template. Do not edit or delete prior entries.

### Phase <N> handover - <completion timestamp>
- Implemented: <summary of what was done + key files actually changed>
- Current state: <repo/app state now relevant to the next phase>
- Decisions / deviations: <any deviation from the plan and why; "none" if none>
- Gotchas: <surprises or pitfalls the next executor must know; "none" if none>
- Next entry point: <exact place/phase the next executor should start>
- Verification: <build/lint/test results, e.g. "npm run build passed">
-->
