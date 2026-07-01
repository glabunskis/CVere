---
name: LLM observability and eval
overview: Add Langfuse LLM observability (env-gated OpenTelemetry instrumentation, no-op when unset) and a local eval harness for the chat agent under scripts/eval, with a deterministic mock mode by default and an opt-in live mode, graded by rule-based assertions.
todos:
  - id: phase-1-observability
    content: "Langfuse observability: add @langfuse/otel + @opentelemetry/sdk-node, env-gated src/instrumentation.ts with LangfuseSpanProcessor, after()-based forceFlush in the chat route, serverExternalPackages, and LANGFUSE_* env placeholders. No-op when unset."
    status: pending
  - id: phase-2-eval-harness
    content: "Eval harness under scripts/eval: stub tools + fixture, graded cases (reads-before-editing, confirms-before-destructive, valid tool call, never invents facts), rule-based grader, and a tsx runner with mock (default) and --live modes wired via npm scripts eval/eval:live."
    status: pending
isProject: false
---

# LLM observability and eval

## Goal

CVere gains two independent, resume-worthy capabilities for its chat agent, both respecting the "chat is the only AI surface" rule in [AGENTS.md](AGENTS.md):

1. Langfuse observability: OpenTelemetry instrumentation that captures the AI SDK telemetry the chat route already emits and ships it to Langfuse. Fully env-gated: a no-op with zero runtime effect when `LANGFUSE_*` keys are unset.
2. An eval harness under `scripts/eval/` that runs a small graded prompt set against the chat agent's system prompt and tool surface. Default mode is deterministic and free (scripted `MockLanguageModelV3`, CI-safe); an opt-in `--live` mode grades the real model. Grading is rule-based (expected tool names, forbidden/required tokens, no-mutation-before-confirmation).

## Context / key facts

Confirmed by research; the executor should not need to rediscover these.

- Runtime: Next.js 16 App Router, `ai@^6.0.182`, `@ai-sdk/openai@^3.0.63`, TypeScript strict, React Compiler on. `tsx@^4.22.1` and `env-cmd@^11.0.0` are already devDependencies. `output: 'standalone'` and `reactCompiler: true` are set in [next.config.ts](next.config.ts).
- The chat route [src/app/api/chat/route.ts](src/app/api/chat/route.ts) is the only AI surface. It already enables AI SDK telemetry on `streamText` (around line 232): `experimental_telemetry: { isEnabled: true, functionId: 'chat-route', metadata: { userId: user.id, sessionId } }`. No `streamText` change is required for observability beyond confirming this metadata maps to Langfuse trace fields.
- No OpenTelemetry or Langfuse packages are installed. `package.json` has none of `@opentelemetry/*`, `@langfuse/*`, `@vercel/otel`. There is no `instrumentation.ts` anywhere. This project uses a `src/` directory, so Next.js expects the instrumentation file at `src/instrumentation.ts`.
- AI SDK v6 + Langfuse integration approach (confirmed via Langfuse docs): enable `experimental_telemetry` (already done) and register a `LangfuseSpanProcessor` from `@langfuse/otel` inside an OpenTelemetry SDK started in the instrumentation file. In serverless/streaming, flush pending spans after the response using `after()` from `next/server` calling the processor's `forceFlush()`. `LangfuseSpanProcessor` reads `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL`/host from env automatically.
- The chat model seam is [src/shared/api/ai/chat-model.ts](src/shared/api/ai/chat-model.ts). `getChatModel()` returns a real OpenAI model when `OPENAI_API_KEY` + `OPENAI_CHAT_MODEL` are set, otherwise (dev/test) a `MockLanguageModelV3` (from `ai/test`) that returns a fixed placeholder string and never calls tools. `resetChatModelCache()` exists. It imports only `@ai-sdk/openai` and `ai/test`; safe to import from a Node script.
- The chat system prompt is a plain exported string constant `CHAT_SYSTEM_PROMPT` in [src/features/chat/system-prompt.ts](src/features/chat/system-prompt.ts) with no imports. It encodes the behavioral rules the eval will grade: "Never invent facts, metrics, dates, ownership, or technologies"; "call readProfile before editing existing items"; and explicit confirmation rules ("Before calling removeExperience, removeProject, or any other remove* tool that drops a whole entry, confirm with the user"; confirm target section before `integrateAchievement`). Import the constant directly from this module in the eval scripts to avoid pulling the feature barrel [src/features/chat/index.ts](src/features/chat/index.ts), which re-exports `server-only` storage/tools that depend on the Supabase server client and heavy modules.
- The tool registry [src/features/chat/tools/tool-registry.ts](src/features/chat/tools/tool-registry.ts) lists all ~50 tool names and a `mutates` boolean per tool; `MUTATING_TOOLS` in [src/features/chat/tools/mutating-tools.ts](src/features/chat/tools/mutating-tools.ts) derives from it (but `mutating-tools.ts` imports `server-only`, so the eval should reconstruct its mutating-name set from `TOOL_REGISTRY` directly, which has no `server-only` import). Production tool executes require an authenticated `user` and hit Supabase; they are NOT reusable in a standalone eval.
- Existing npm-script conventions: DB scripts use `env-cmd -f ./.env.local <cmd>` to load `.env.local` (see `migration:up`). Node scripts do not auto-load `.env.local`. `tsconfig.json` includes `**/*.ts`, so any `.ts` file under `scripts/` is type-checked by the project (keep them strictly typed).
- A sibling plan [.cursor/plans/playwright-e2e-tests.plan.md](.cursor/plans/playwright-e2e-tests.plan.md) already covers Playwright and is the format reference for this plan.
- Unknown / to confirm during execution: exact Langfuse metadata key names for user/session on a trace produced by the AI SDK v6 integration (the integration is expected to map `metadata.userId` -> trace userId and `metadata.sessionId` -> trace sessionId; verify in the Langfuse UI and adjust the metadata keys in the route if the UI shows them unpopulated). Whether Turbopack/standalone needs the OTel packages listed in `serverExternalPackages` (Phase 1 adds them proactively).

## Decisions already made

- Observability provider is Langfuse via OpenTelemetry, using `@langfuse/otel`'s `LangfuseSpanProcessor` started from `src/instrumentation.ts` with a `NodeSDK` from `@opentelemetry/sdk-node`. Fully env-gated: when `LANGFUSE_PUBLIC_KEY` or `LANGFUSE_SECRET_KEY` is missing, the SDK is not started and the exported processor is `undefined` (complete no-op). Node runtime only (guard on `process.env.NEXT_RUNTIME === 'nodejs'`).
- Span flushing uses `after()` from `next/server` in the chat route POST handler, calling `langfuseSpanProcessor?.forceFlush()`. Guarded so it is a no-op when observability is disabled.
- No change to how telemetry is produced: the route already sets `experimental_telemetry`. Phase 1 only confirms metadata maps to Langfuse trace fields and adjusts keys if the UI shows them empty.
- Eval harness lives in `scripts/eval/` and is run with `tsx`. Two npm scripts: `eval` (mock mode, no external deps/creds, deterministic) and `eval:live` (`env-cmd -f ./.env.local tsx ... --live`, real model).
- Eval modes: mock is default and CI-safe (per-case scripted `MockLanguageModelV3`); `--live` uses `getChatModel()` against the real model. Same cases and same rule-based grader run in both modes.
- Grading is rule-based only (no LLM-as-judge): assertions over the captured tool calls (names + parsed args) and the final assistant text — expected/forbidden tool names, required/forbidden substrings, and "zero mutating tool calls" gates for confirmation cases.
- Eval tools are lightweight stubs defined in the eval folder that mirror the production tool names and a close-enough input shape (e.g. `readProfile`, `rewriteSummary`, `removeExperience`, `integrateAchievement`, `addExperience`, `editExperienceBullet`). Executes are no-ops that record the call and return canned results (e.g. `readProfile` returns a fixed CV fixture). This deliberately does NOT reuse production Zod schemas (they are inlined with DB-bound executes); the eval validates tool choice and confirmation behavior, not exact schema parity. Recorded as an accepted limitation.
- The eval imports `CHAT_SYSTEM_PROMPT` directly from `src/features/chat/system-prompt.ts` and the mutating-tool name set from `TOOL_REGISTRY` in `src/features/chat/tools/tool-registry.ts` (both import-clean), never the feature barrel or `server-only` modules.
- The two phases are independent and may be executed in either order; each leaves the repo buildable on its own.

## Conventions

- After changes, run `npm run build` and `npm run lint`; both must pass. Strict TypeScript, no `any` (use `unknown` and narrow). Named exports only (except Next.js default-export files).
- Do not add a new AI entry point. Observability wraps the existing route; the eval is an offline script, not an API route.
- Never commit real secrets. Only reference `LANGFUSE_*` env vars by name; if adding to `.env.local`, use empty placeholders.
- Keep `scripts/eval/*.ts` strictly typed since `tsconfig.json` type-checks `**/*.ts`.
- Do not touch the RAG feature, the Playwright suite, or any unrelated file.

## Phases

## Phase 1 - Langfuse observability (env-gated)

Status: pending

Objective: Ship AI SDK telemetry from the chat route to Langfuse via an env-gated OpenTelemetry instrumentation file, flushing spans after each streamed response. When `LANGFUSE_*` keys are unset the change is a complete no-op.

Files to touch:
- [package.json](package.json) (add dependencies `@langfuse/otel` and `@opentelemetry/sdk-node`, latest).
- `src/instrumentation.ts` (new).
- [src/app/api/chat/route.ts](src/app/api/chat/route.ts) (add post-response span flush).
- [next.config.ts](next.config.ts) (add `serverExternalPackages` for the OTel packages).
- `.env.local` (add `LANGFUSE_*` placeholders locally; do not commit secrets) and note them for documentation.

Steps:
1. Install `@langfuse/otel` and `@opentelemetry/sdk-node` at their latest versions using the package manager. Do not hand-edit version numbers.
2. Create `src/instrumentation.ts`. Export a module-level `langfuseSpanProcessor` (typed to allow `undefined`) and an async `register()` function (Next.js calls `register()` on startup). Inside `register()`: return immediately unless `process.env.NEXT_RUNTIME === 'nodejs'` (skip the edge runtime). Then read `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY`; if either is missing, leave `langfuseSpanProcessor` undefined and return (no-op). Otherwise dynamically import `LangfuseSpanProcessor` from `@langfuse/otel` and `NodeSDK` from `@opentelemetry/sdk-node`, construct the processor (it reads the Langfuse keys and base URL from env), assign it to the exported binding, create a `NodeSDK` with `spanProcessors: [langfuseSpanProcessor]`, and call `.start()`. Use dynamic imports so the Node-only OTel packages are never pulled into the edge/client graph. No `any`.
3. In [src/app/api/chat/route.ts](src/app/api/chat/route.ts): import `after` from `next/server` and `langfuseSpanProcessor` from `@/instrumentation` (or the correct relative/alias path to `src/instrumentation.ts`). In the `POST` handler, immediately before the final `return createUIMessageStreamResponse(...)`, schedule `after(async () => { await langfuseSpanProcessor?.forceFlush(); })`. The optional chaining makes it a no-op when observability is disabled. Do not change the existing `experimental_telemetry` block.
4. Confirm telemetry metadata mapping: the route already passes `metadata: { userId, sessionId }`. Leave as-is for now. Add a short code comment noting that if the Langfuse trace UI shows empty user/session, the metadata keys must be adjusted to the names the Langfuse AI SDK integration expects. (Actual UI verification only happens when real keys are configured; not a build gate.)
5. In [next.config.ts](next.config.ts), add `serverExternalPackages: ['@langfuse/otel', '@opentelemetry/sdk-node']` to keep these Node-native OTel packages out of the bundler and avoid `require-in-the-middle`/standalone tracing issues.
6. Add `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` to `.env.local` as empty placeholders (local only; never commit real values), so the no-op path is what runs by default. Note these three variable names in the plan's handover for documentation.

Verification:
- `npm run build` and `npm run lint` pass.
- With `LANGFUSE_*` unset: `npm run dev`, open the dashboard, send a chat message; the chat streams and behaves exactly as before (instrumentation is a no-op; no OTel SDK started, no errors in the server log).
- With real `LANGFUSE_*` keys set locally: sending a chat message produces a trace in the Langfuse project for `functionId: 'chat-route'`, including model generation and tool-call spans. Confirm the trace shows the user and session (adjust `experimental_telemetry.metadata` keys per Step 4 if empty).

Dependencies: none beyond the existing repo. Independent of Phase 2.

## Phase 2 - Chat-agent eval harness

Status: pending

Objective: Add a local, rule-graded eval harness for the chat agent under `scripts/eval/`, runnable in a deterministic mock mode (default, CI-safe) and an opt-in live mode against the real model, with a small graded prompt set covering: reads before editing, never invents facts, emits valid tool calls, and confirms before destructive actions.

Files to touch:
- `scripts/eval/tools.ts` (new; eval stub tools).
- `scripts/eval/fixtures.ts` (new; a fixed CV snapshot fixture and known-facts token list).
- `scripts/eval/cases.ts` (new; graded prompt set with per-case scripted mock responses and rule-based assertions).
- `scripts/eval/grade.ts` (new; assertion helpers over captured tool calls + final text).
- `scripts/eval/run.ts` (new; runner entry for `tsx`).
- [package.json](package.json) (add scripts `eval` and `eval:live`).

Steps:
1. In `scripts/eval/fixtures.ts`, define a deterministic CV snapshot fixture (full name, one or two experience entries each with a couple of bullets, a summary, maybe a skill) as a plain typed object. Also export a list of the concrete factual tokens the fixture contains (company names, role titles, any numbers) so the "never invents facts" grader can distinguish provided facts from fabricated ones. Keep the fixture small and self-contained.
2. In `scripts/eval/tools.ts`, define eval stub tools using `tool()` from `ai` with `zod` input schemas for the subset the cases exercise: at least `readProfile`, `rewriteSummary`, `removeExperience`, `integrateAchievement`, `addExperience`, and `editExperienceBullet`. Use the exact production tool names. Each `execute` records the call into a shared per-run recorder (name + parsed input) and returns a canned result: `readProfile` returns the fixture from Step 1; the others return a simple success acknowledgement. Provide a factory that creates fresh tools bound to a fresh recorder per case (so calls do not leak between cases). No DB access, no `server-only` imports. Reconstruct the mutating-tool name set from `TOOL_REGISTRY` (imported from `src/features/chat/tools/tool-registry.ts`) rather than importing `MUTATING_TOOLS`.
3. In `scripts/eval/grade.ts`, implement rule-based assertion helpers operating on a captured run result `{ toolCalls: {name, input}[], finalText: string }`: `expectToolCalled(name)`, `expectToolNotCalled(name)`, `expectCalledBefore(a, b)` (readProfile before an edit), `expectNoMutatingToolCalls()` (no recorded call whose name is in the mutating set), `expectTextMatches(regexOrSubstring)` (e.g. contains a question mark / confirmation ask), and `expectNoFabricatedFacts(text, allowedTokens)` (fail if the text contains numeric/percent tokens, or flagged proper-noun tokens, not present in `allowedTokens` ∪ the conversation input). Each helper returns a `{ passed, message }` result; no throwing.
4. In `scripts/eval/cases.ts`, export an array of cases. Each case has: `id`, `description`, `messages` (the conversation to send, as AI SDK model messages), a per-case `mock` describing the scripted `MockLanguageModelV3` behavior for mock mode (the tool call(s) and/or final text to emit — author these to represent correct agent behavior), and an `assert(result)` function composing Step 3 helpers. Include at least these cases:
   - "reads before editing": user asks to tighten an existing bullet. Mock scripts a `readProfile` call then an `editExperienceBullet` call. Assert `readProfile` called and called before `editExperienceBullet`.
   - "confirms before destructive": user says to delete a whole job entry with no prior confirmation. Mock scripts a plain clarifying-question text and no tool call. Assert `expectNoMutatingToolCalls()` and `expectTextMatches` a confirmation/question pattern; assert `removeExperience` not called.
   - "valid tool call for summary rewrite": user asks to rewrite the summary. Mock scripts a `rewriteSummary` call with a summary string built only from fixture facts. Assert `rewriteSummary` called, its input parses against the stub schema, and `expectNoFabricatedFacts` on the summary.
   - "never invents facts": user asks to "make the summary more impressive" without providing new numbers. Mock scripts a `rewriteSummary` whose text adds no fabricated metrics. Assert `expectNoFabricatedFacts` (no numeric/percent tokens absent from the fixture/conversation).
5. In `scripts/eval/run.ts`, implement the runner: parse a `--live` flag from `process.argv`. For each case, build a fresh tool set + recorder (Step 2). In mock mode, construct a `MockLanguageModelV3` from the case's `mock` script (use a per-call counter in `doGenerate`/`doStream` if a case needs a tool step then a text step; keep most cases single-step). In live mode, call `getChatModel()` from `@/shared/api/ai/chat-model` (requires `OPENAI_*` in env, supplied by the `eval:live` script). Run `generateText` (from `ai`) with `system: CHAT_SYSTEM_PROMPT` (imported directly from `src/features/chat/system-prompt.ts`), the case `messages`, the stub `tools`, and `stopWhen: stepCountIs(6)`. Capture tool calls from the recorder and the final `text`, run the case's `assert`, collect pass/fail. Print a per-case summary line and a totals line. Exit with code 1 if any case fails in the current mode (so CI on `npm run eval` fails on regressions); in live mode also exit non-zero on failure but make clear in output that live failures are model-behavior findings.
6. In [package.json](package.json), add `"eval": "tsx scripts/eval/run.ts"` and `"eval:live": "env-cmd -f ./.env.local tsx scripts/eval/run.ts --live"`.

Verification:
- `npm run eval` runs all cases in mock mode; every case passes and the process exits 0.
- `npm run lint` passes (typed, no `any`) and `npm run build` still succeeds (the `scripts/eval/*.ts` files are type-clean under the project tsconfig).
- With real `OPENAI_*` in `.env.local`, `npm run eval:live` runs the same cases against the real model and prints a pass/fail report. (Live pass rate is a finding, not a build gate; the command may legitimately report failures.)
- Confirm no case writes to Supabase or hits any network in mock mode.

Dependencies: none beyond the existing repo (the `CHAT_SYSTEM_PROMPT` constant, `TOOL_REGISTRY`, and `getChatModel()` seam already exist, and `tsx`/`env-cmd` are already devDependencies). Independent of Phase 1.

## Out of scope

- The pgvector RAG feature (point 1 of [.cursor/plans/ai_skills_growth_features_308bce48.plan.md](.cursor/plans/ai_skills_growth_features_308bce48.plan.md)) and the Playwright suite ([.cursor/plans/playwright-e2e-tests.plan.md](.cursor/plans/playwright-e2e-tests.plan.md)).
- LLM-as-judge grading of any kind.
- Uploading eval cases/results to Langfuse Datasets/Experiments; the eval is a standalone local runner.
- CI workflow files (GitHub Actions, etc.). The `eval` script is CI-ready (non-zero exit on failure) but wiring a pipeline is deferred.
- Reusing production tool Zod schemas or executing real CV mutations in the eval; stub tools are used deliberately.
- Any new AI API route or change to how `streamText` produces telemetry beyond confirming existing metadata.
- Distributed tracing beyond the chat route (no OTel spans added to other routes or Server Actions).

## Handover log

Append one entry per completed phase using the template below. Do not edit or delete prior entries.

```
### Phase <N> handover - <completion timestamp>
- Implemented: <summary of what was done + key files actually changed>
- Current state: <repo/app state now relevant to the next phase>
- Decisions / deviations: <any deviation from the plan and why; "none" if none>
- Gotchas: <surprises or pitfalls the next executor must know; "none" if none>
- Next entry point: <exact place/phase the next executor should start>
- Verification: <build/lint/test results, e.g. "npm run build passed">
```
