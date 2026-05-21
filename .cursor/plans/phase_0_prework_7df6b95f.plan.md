---
name: Phase 0 prework
overview: Wire up the real OpenAI provider in dev, replace the commented subscription-gate block with an env-flag-gated live check, and add a reusable smoke test (script + short manual checklist) for the four LLM-backed actions.
todos:
  - id: env-example
    content: "Update .env.local.example: recommend AI_PROVIDER=openai, add CHAT_REQUIRE_SUBSCRIPTION=false with comments"
    status: pending
  - id: chat-route-gate
    content: Replace commented subscription block in src/app/api/chat/route.ts with env-flag-gated live check (CHAT_REQUIRE_SUBSCRIPTION)
    status: pending
  - id: smoke-script
    content: Create scripts/smoke-ai.ts that calls getAiProvider() for extractJobDescription / normalizeAchievement / tailorCv / generateCoverLetter with inline fixtures, prints durations, exits 1 on any error
    status: pending
  - id: tsx-and-script
    content: Add tsx as devDependency and add npm run smoke:ai script in package.json
    status: pending
  - id: verify-build
    content: Run npm run lint and npm run build to confirm no type errors from route change
    status: pending
isProject: false
---

## Scope

Three Phase 0 commitments from the roadmap:

1. Flip dev to `AI_PROVIDER=openai` and verify the four LLM-backed actions still work end to end.
2. Replace the commented subscription block in [src/app/api/chat/route.ts](src/app/api/chat/route.ts) with a live gate behind a single env flag `CHAT_REQUIRE_SUBSCRIPTION` (default `false`).
3. Skip Langfuse for now (no code change).

Smoke test form: standalone `tsx` script for the four AI methods, plus a manual UI checklist.
Subscription gate: env-flag approach, default off.

## Out of scope

- Langfuse / OTEL wiring (Phase Observability).
- Any chat data-model changes (Phase 1).
- Adding tools or new surfaces (Phase 2).
- Removing the `StubbedAiBadge` component — still useful as a visual cue when someone leaves `AI_PROVIDER=stub`.

## File changes

### 1. `.env.local.example` — document dev defaults

- Flip the recommended default to `AI_PROVIDER=openai` so a fresh dev clone has a clear signal that stub is fallback-only. Keep `AI_PROVIDER=stub` documented as the offline alternative in a comment.
- Add `CHAT_REQUIRE_SUBSCRIPTION=false` under a new "Feature gates" section, with one-line comment explaining the toggle.
- Leave `OPENAI_API_KEY=` blank (each dev fills it in).

### 2. `src/app/api/chat/route.ts` — live subscription gate

Replace the dead block at lines 44-52 with a real conditional check. Existing imports (`ProSubscriptionRequiredError`, `requireActiveSubscription`) are kept, the rest of the file is unchanged.

```ts
// 2. Subscription gate. Off by default; flip CHAT_REQUIRE_SUBSCRIPTION=true to enforce.
if (process.env.CHAT_REQUIRE_SUBSCRIPTION === 'true') {
  try {
    await requireActiveSubscription();
  } catch (err) {
    if (err instanceof ProSubscriptionRequiredError) {
      return new Response(err.message, { status: err.httpStatus });
    }
    throw err;
  }
}
```

Reasoning: the plan's recommendation. Removes commented code (which lint configs don't catch but adds noise) while keeping the path live and toggleable for any future demo where gating matters.

### 3. `scripts/smoke-ai.ts` (new) — reusable provider smoke test

A standalone script that calls `getAiProvider()` directly with hand-built fixtures — bypassing the safe-action / Supabase layers so it isolates the provider from auth + DB. Covers the four LLM-backed methods named in Phase 0:

- `extractJobDescription` — small inline JD string fixture.
- `normalizeAchievement` — single raw achievement line.
- `tailorCv` — one-experience + one-skill `AiProfile` plus an `ExtractedJd` from the first step.
- `generateCoverLetter` — same profile + JD.

Behaviour:

- Prints `provider=<name>` (must be `openai` for the test to count; warn if `stub`).
- For each method: prints `method | durationMs | ok | shortPreview` and `process.exitCode = 1` on any throw.
- Uses Node's native `--env-file=.env.local` flag (Node 20.6+), so no extra dotenv dep.

Imports use the existing `@/*` alias (tsx resolves tsconfig paths from project root):

```ts
import { getAiProvider, getAiProviderKind } from '@/libs/ai';
```

Fixtures live inline at the top of the script — small enough that a separate fixtures file would be over-engineering at this stage.

### 4. `package.json` — devDep + script

- Add `tsx` to `devDependencies` (current package set has no TS script runner; everything else uses `next` or `env-cmd`).
- Add script: `"smoke:ai": "node --env-file=.env.local --import tsx ./scripts/smoke-ai.ts"`.

`--import tsx` is the recommended way to register tsx with Node ESM. If the host Node version is < 20.6, fall back to: `tsx ./scripts/smoke-ai.ts` and document `.env.local` must be loaded externally. Will default to the `--env-file` form since the repo already targets modern Node (Next 16 requires Node 20.18+).

## Manual UI checklist (run after `npm run smoke:ai` passes)

Short end-to-end pass through the four user-facing flows that exercise the same four methods. Not committed to the repo — just the operator checklist for Phase 0 acceptance:

1. In `.env.local`, set `AI_PROVIDER=openai` and a real `OPENAI_API_KEY`. Run `npm run dev`.
2. Confirm the yellow "Stubbed AI" badge (`src/components/stubbed-ai-badge.tsx`) is gone.
3. Vacancies → "New" → paste any short JD → confirm extracted requirements/stack/keywords look right (not stub-deterministic).
4. From the same JD detail page, click "Tailor CV" → confirm a tailored variant is created and the summary reads like a real rewrite, not the stub template.
5. Same page, click "Write cover letter" → confirm letter body is grounded in profile + JD, ~3 paragraphs, no greeting block.
6. Achievements page → submit "shipped invoice export feature, cut support tickets" → confirm normalised bullet rewrites it (active voice) and picks a section.

If any of the four UI flows still shows stub output despite the script passing, the surface is reading from a cached or mismatched call site — investigate before declaring Phase 0 done.

## Verification

- `npm run lint`
- `npm run build` (catches type errors from the route change)
- `npm run smoke:ai` (requires `.env.local` with `OPENAI_API_KEY`; acceptable to defer if the operator hasn't put their key in yet — but the script itself must compile and run end to end before merge)

## Done criteria (from the roadmap)

- Real provider live in dev: `.env.local.example` recommends `openai`; UI badge confirms which provider is active.
- Subscription gate decision recorded in code: env flag implemented; commented block gone.
- Smoke tests pass for the four LLM-backed actions: `scripts/smoke-ai.ts` + manual UI checklist both green.