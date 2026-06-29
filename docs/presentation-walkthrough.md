# CVere — Presentation Walkthrough

A grounded walkthrough of the CVere codebase for presenting to a potential hirer. Everything here reflects the actual implementation, including honest gaps.

---

## 1. The 30-second pitch

CVere is a "CV operating system." A user owns one or more CVs stored as normalized Postgres rows. The product is a single workspace (the dashboard), not a multi-page CRUD app. An AI chat agent is the only AI surface; it edits the selected CV in place via tools, records an undo step, regenerates a PDF, and the preview re-signs its URL. Everything else (achievements, vacancies, style, manual editing) is deliberate manual CRUD.

**Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Supabase (Postgres + Auth + Storage), Stripe, Tailwind v4, shadcn/ui, AI SDK v6, `@react-pdf/renderer`.

---

## 2. Architecture: Feature-Sliced Design

One sentence to say cold: "Imports only flow downward through five layers."

```
views → widgets → features → entities → shared
```

- `views/` — page compositions (`*View`)
- `widgets/` — multi-feature UI blocks (control-panel, app-nav, cv-library)
- `features/` — user actions (chat, cv-management, profile-editor, achievements, vacancies, cv-history, cv-style, cv-preview, cv-import, auth)
- `entities/` — domain + data access, no UI (`cv`, `user`, `subscription`, `achievement`, `job`)
- `shared/` — infra only (Supabase/Stripe/AI clients, UI primitives, utils)

`app/` is kept as the thin Next.js routing layer. ESLint enforces the downward rule. Documented deviations exist: `shared/lib/safe-action.ts` imports `entities/user/get-session`, and `features/chat` composes other features as an orchestration hub. Knowing your own accepted deviations is exactly what impresses.

---

## 3. The four systems to know deeply

Prioritize the chat agent and the data/versioning model.

### A. The chat agent — `src/app/api/chat/route.ts`

Flow of one turn:

1. Authenticate (`supabase.auth.getUser()` → 401 if missing), optional subscription gate.
2. Persist the user message **before** streaming (so the prompt survives a failed generation).
3. Resolve which CV to edit: `context.cv.id` from the client, falling back to the user's selected CV.
4. `streamText` with ~58 tools merged from builders (content, entries, sections, identity, style, layout, achievements, vacancies, meta). `stopWhen: stepCountIs(20)`.
5. Tools are thin adapters — they only mutate Postgres rows via `entities/cv/cv-service.ts`. They never render PDFs.
6. At the end of the turn (`onFinish`), for each CV touched: record one undo version, render the PDF once, emit a `data-preview-dirty` SSE event.
7. Persist the assistant message.

Three design decisions to call out:

- **Deferred, batched PDF render** — tools touch only the DB; one render per turn, not per tool call. Cheaper, avoids races.
- **`ActiveCvRef`** — a mutable ref lets the agent switch the active CV mid-turn (e.g. after `createCv`) without threading IDs through the model.
- **Resumable streams** — SSE is teed to Upstash Redis, so a page reload reconnects to the in-flight stream. Degrades gracefully (returns 204) when Redis isn't configured.

### B. CV data model + the `AiProfile` snapshot

One-liner: "Normalized storage, denormalized snapshot."

- **Storage:** a `cv` root row plus six ordered section tables (`experience`, `project`, `skill`, `education`, `certification`, `language`), each keyed by `cv_id` with a `position` column.
- **Snapshot:** `buildCvSnapshot()` flattens those rows into `AiProfile` — a Zod-validated, camelCase aggregate that is the single unit consumed by the AI tools, the PDF renderer, and the diff engine.
- **Service:** `cv-service.ts` (~2,000 lines) is the only server mutation layer for CV content: ownership scoping, CRUD, ordering, and validation caps (50 rows/section, 500 chars/bullet, etc.).

### C. Undo/redo via reversible diffs — `cv-diff.ts` + `cv_version`

- Each edit boundary stores a **structured diff** (not a full copy) in `cv_version`, with a `seq`.
- `cv.history_seq` is a **cursor**. Version `seq = N` is the transition `N-1 → N`. Undo applies the inverse diff and decrements; redo applies the forward diff and increments.
- **One version per boundary:** a whole chat turn collapses into one undo step; a manual save is one step. History pruned to the newest 100.
- Stable row UUIDs are what make id-preserving, reversible diffs possible.

### D. PDF pipeline

- **Two different PDF libraries** — be ready for this. Generation on the server uses `@react-pdf/renderer` (`render.tsx` → `renderToBuffer`). Display in the browser uses `react-pdf`/pdf.js.
- Output uploaded to a **private** `pdf` storage bucket at `{userId}/cv/{cvId}.pdf`; `cv.pdf_path` points to it.
- Layout is **data-driven**: a `layout_json` spec (single/two column, density, section placement) interpreted by `layout-executor.tsx`. Fonts are Latin Modern Roman, registered with ligature-stripped variants to work around a `@react-pdf/renderer` bug.
- Preview never renders inline. The client gets a short-lived signed URL via `createSignedPreviewUrl` (60s), refreshed whenever it receives `data-preview-dirty`.

---

## 4. Security — "defense in depth"

A layered answer to a common probe:

1. **Edge proxy** (`proxy.ts`) refreshes the session and redirects unauthenticated users from guarded routes. `/api/*` is intentionally excluded so SSE isn't buffered.
2. **`(app)/layout.tsx`** redirects server-side if no session.
3. **Server Actions** use `next-safe-action`'s `authActionClient`, which injects the user and throws on no session. Key point: page-level auth does **not** protect Server Actions — the action client does.
4. **RLS** on every public table (`auth.uid() = user_id`) is the last line of defense.
5. **API routes** self-authenticate; the webhook validates the Stripe signature instead.
6. **Storage** is private; signed URLs are owner-prefix scoped.

---

## 5. Stripe — be honest

Webhook-driven sync to Postgres mirror tables (`products`, `prices`, `subscriptions`, `customers`) via the admin client. But: there is **no checkout UI built yet** (`getOrCreateCustomer` exists but is unused), and the subscription gate on chat is **dormant** behind the `CHAT_REQUIRE_SUBSCRIPTION` env flag. The live surfaces are the webhook sync and the billing portal redirect. State this plainly — it reads as integrity.

---

## 6. Live demo script (5-7 min)

1. Land on `/dashboard`: show the three-panel workspace (chat left, PDF preview center, control panel right).
2. Ask the agent for one concrete edit, e.g. "Rewrite my summary to target a backend role" or "Add a bullet to my most recent experience." Narrate: tool call → DB mutation → preview refreshes.
3. Hit Undo (Ctrl+Z) to show the whole turn reverts as one step. Mention the reversible-diff model.
4. Show "Tailor in chat" from a vacancy: it `createCv`s a copy and edits that, leaving the original untouched.
5. Switch the Style tab / template to show the layout-driven PDF regenerate.
6. Optional: reload mid-stream to demo resumable streams (only if Redis is configured locally).

Rehearse once with a real network connection so a slow model response doesn't surprise you.

---

## 7. Likely questions and crisp answers

- **"Why is chat the only AI surface?"** Keeps AI cost, auditing, and undo in one place; everything else is intentionally manual.
- **"Why render the PDF once per turn?"** Cost and correctness — batches all tool mutations into one render, avoids partial/racing renders.
- **"How does undo work?"** Reversible structured diffs keyed by stable UUIDs; `history_seq` is a cursor over `cv_version` rows.
- **"Why two PDF libraries?"** Server generation (`@react-pdf/renderer`) vs browser display (`react-pdf`/pdf.js) are different concerns; the server produces the artifact, the client just renders the stored file.
- **"How do you protect Server Actions?"** `authActionClient` middleware, backed by RLS — not middleware/page guards, which don't cover actions.
- **"Why Feature-Sliced Design?"** Enforces a one-way dependency graph so domain logic stays in `entities`, UI actions in `features`, and infra in `shared`; deviations are documented, not accidental.
- **"What happens if Redis/Stripe/the model isn't configured?"** Graceful degradation: resumable streams fall back to normal SSE; chat uses a mock model in dev; billing is dormant behind a flag.

---

## 8. Honest gaps to own (don't get caught off guard)

- No in-app checkout flow; `getOrCreateCustomer` is unused.
- Subscription gating is off unless `CHAT_REQUIRE_SUBSCRIPTION=true`.
- OAuth sign-in exists in the action layer but is not exposed in the UI (email/password only).
- `getUser()` (profile row fetch) is exported but unused elsewhere.
- Some docs reference `/profile` and `/achievements` as routes; they are actually tabs inside the dashboard, not separate pages.

---

## Key file index

| Concern | Path |
|---------|------|
| Chat agent orchestration | `src/app/api/chat/route.ts` |
| Model config | `src/shared/api/ai/chat-model.ts` |
| Resumable streams | `src/shared/api/ai/resumable-stream.ts` |
| System prompt | `src/features/chat/system-prompt.ts` |
| Chat tools | `src/features/chat/tools/*.ts` |
| Chat UI + SSE handling | `src/features/chat/components/chat-panel.tsx` |
| CV service (mutation layer) | `src/entities/cv/cv-service.ts` |
| Snapshot builder | `src/entities/cv/cv-snapshot.ts` |
| Diff engine (undo/redo) | `src/entities/cv/cv-diff.ts` |
| Version service | `src/features/cv-history/cv-version-service.ts` |
| PDF render + upload | `src/entities/cv/render.tsx` |
| PDF layout executor | `src/entities/cv/pdf/templates/layout-executor.tsx` |
| Fonts / theme | `src/entities/cv/pdf/theme.ts` |
| Preview store | `src/features/cv-preview/preview-store.ts` |
| Signed URLs | `src/features/cv-preview/sign-pdf-url.action.ts` |
| Auth actions | `src/features/auth/auth-actions.ts` |
| Route guard | `src/proxy.ts` + `src/shared/api/supabase/supabase-middleware-client.ts` |
| Safe-action clients | `src/shared/lib/safe-action.ts` |
| Stripe webhook | `src/app/api/webhooks/route.ts` |
| Subscription sync | `src/entities/subscription/upsert-user-subscription.ts` |
