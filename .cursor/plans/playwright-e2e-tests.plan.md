---
name: Playwright E2E for the core authenticated flow
overview: Add Playwright end-to-end testing to CVere from scratch, covering the core authenticated flow (login, dashboard load, chat message with the mock model, PDF preview) against the hosted Supabase project, with a service-role-provisioned test user and a deterministic mock chat model.
todos:
  - id: phase-1-harness
    content: "Install and scaffold Playwright: deps, playwright.config.ts (webServer on port 3100, OPENAI unset), npm scripts, .gitignore, and an unauthenticated guard smoke spec."
    status: pending
  - id: phase-2-auth
    content: "Authentication fixture: idempotent service-role test-user provisioning, UI login setup project that saves storageState, and an authenticated-access verification spec."
    status: pending
  - id: phase-3-core-flow
    content: "Core authenticated flow spec: dashboard loads, send a chat message and assert the mock assistant reply, and assert the PDF preview surface."
    status: pending
isProject: false
---

# Playwright E2E for the core authenticated flow

## Goal

CVere gains a working Playwright end-to-end test suite (none exists today). The suite runs its own Next.js dev server on a dedicated port with the OpenAI env vars blanked so the chat agent returns a fixed mock string, provisions a dedicated test user in the hosted Supabase project via the service-role key, logs that user in through the real login UI once and reuses the saved session, and verifies the core flow: unauthenticated route protection, login, dashboard load, sending a chat message and receiving the deterministic mock reply, and the PDF preview surface rendering.

## Context / key facts

Confirmed by research; the executor should not need to rediscover these.

- No test tooling exists. [package.json](package.json) has no `test` script and none of `@playwright/test`, `vitest`, or `jest`. There is no `playwright.config.*`, no `e2e/`, no `tests/`, no `data-testid` anywhere under `src/`. Selectors must use role, `aria-label`, label text, placeholder, visible text, or the react-pdf default CSS class.
- The app is a Next.js 16 App Router project. Dev server command is `next dev --turbopack` (script `dev` in [package.json](package.json)). The user typically runs it on port 3000; the E2E server must use a different port to avoid clashing.
- Login page is at route group `(auth)`: [src/app/(auth)/login/page.tsx](src/app/(auth)/login/page.tsx) renders `AuthPage` -> `AuthUI` ([src/features/auth/auth-ui.tsx](src/features/auth/auth-ui.tsx)). Login form fields have ids `#email` (type email) and `#password` (type password); submit button text is `Sign in` (becomes `Signing in...` while pending). Page H1 is `Sign in to your account`, subtitle `Enter your email and password`.
- Login submits via next-safe-action calling `signInWithPassword` ([src/features/auth/auth-actions.ts](src/features/auth/auth-actions.ts)); on success the server does `redirect('/dashboard')`. If an already-authenticated user hits `/login`, `AuthPage` server-redirects to `/account`.
- Route protection: middleware [src/proxy.ts](src/proxy.ts) delegates to `updateSession` in [src/shared/api/supabase/supabase-middleware-client.ts](src/shared/api/supabase/supabase-middleware-client.ts), which redirects unauthenticated requests for `/dashboard` (and `/account`, `/manage-subscription`, `/vacancies`) to `/login`. The `(app)` layout ([src/app/(app)/layout.tsx](src/app/(app)/layout.tsx)) also redirects to `/login` when there is no session.
- Auth uses Supabase SSR cookies (`@supabase/ssr`), set/refreshed via the server client [src/shared/api/supabase/supabase-server-client.ts](src/shared/api/supabase/supabase-server-client.ts) and the middleware client. A logged-in browser session is expressed purely as cookies, so Playwright `storageState` capture works.
- Dashboard route [src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx) calls `getOrCreateDefaultSession(user.id)`, which returns an existing `chat_session` or creates one (default title `New chat`). So after login the dashboard already has a usable chat session; the test does not need to create one before sending a message.
- Dashboard UI selectors (from [src/views/dashboard/ui/DashboardWorkspace.tsx](src/views/dashboard/ui/DashboardWorkspace.tsx) and chat/preview components):
  - App nav link `Previewer` (has `aria-current="page"` on `/dashboard`) and link `Vacancies`.
  - Empty-chat heading `Edit your CV in chat`.
  - Chat input is a textarea with `aria-label="Chat message"`, placeholder `Ask me to read your CV or edit a bullet...` ([src/features/chat/components/chat-input.tsx](src/features/chat/components/chat-input.tsx)).
  - Send button has `aria-label="Send message"`. Submit works via Enter (no Shift) or form submit. While generating, the send button is replaced by one with `aria-label="Stop generation"`.
  - Assistant messages render a label `Assistant`; user messages render label `You`. A `WorkingIndicator` shows visible text `Working` while a reply is in flight.
  - Preview column ([src/features/cv-preview/previewer-pane.tsx](src/features/cv-preview/previewer-pane.tsx), [src/features/cv-preview/pdf-viewer.tsx](src/features/cv-preview/pdf-viewer.tsx)) uses react-pdf, which renders `<canvas>` inside `.react-pdf__Page`. Toolbar shows label `CV`, a `Refresh` button, and a status pill `Up to date` / `Updating...`. Before a signed URL exists it shows `No preview yet for this target. Press Refresh to render.`; while loading, `Loading preview...`.
- Mock chat model: [src/shared/api/ai/chat-model.ts](src/shared/api/ai/chat-model.ts). When `OPENAI_API_KEY` and/or `OPENAI_CHAT_MODEL` are unset AND `NODE_ENV` is not `production`, `getChatModel()` returns a `MockLanguageModelV3` whose fixed text is exactly: `[mock] OPENAI_* env vars are not set; returning a placeholder.` The title model mock returns `General`. In production these throw instead, so the E2E server must run in development mode.
- The chat route [src/app/api/chat/route.ts](src/app/api/chat/route.ts) does NOT require a subscription by default (only when `CHAT_REQUIRE_SUBSCRIPTION=true`). It requires an existing owned `chat_session` (404 otherwise), which the dashboard already provides. It streams via `smoothStream` (word-by-word), so assertions must wait for the full mock string to accumulate.
- New-user provisioning side effects: the signup trigger `handle_new_user_profile()` in [supabase/migrations/20260525114000_unify_cv_model.sql](supabase/migrations/20260525114000_unify_cv_model.sql):463 auto-creates a default `Master` CV (`is_default=true`) and seeds `cv_preferences` for every new `auth.users` row. So an admin-created test user immediately has a default CV, which the dashboard renders in the preview.
- Env vars available in [.env.local](.env.local) (names only): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus the `OPENAI_*` set. `@supabase/supabase-js` is already a dependency and exposes `auth.admin.createUser` when constructed with the service-role key.
- Next.js loads `.env.local` via `@next/env`, which does NOT override variables already present in `process.env`. Therefore, if the E2E web server process is started with `OPENAI_API_KEY=""` (and the other `OPENAI_*` blanked), Next will not re-populate them from `.env.local`, and the mock model path activates. This is the mechanism used for deterministic chat.
- Unknown / to confirm during execution: exact time for the first PDF render of a fresh default CV in dev (react-pdf server render + signed URL). Treat the canvas assertion as slow and use a generous timeout; the hard preview assertion is the toolbar, not the canvas.

## Decisions already made

- Test environment: run against the existing hosted Supabase project (not local Supabase, not mocked cookies). This is confirmed by the user.
- Test user provisioning: a dedicated test user is created/ensured idempotently via the Supabase service-role admin API in a setup step (writes one real user row to the hosted project). Credentials come from env vars `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` with sane defaults if unset (email like `e2e+cvere@example.test`, password at least 8 characters). The user is created with `email_confirm: true` so login works without an email round-trip. If the user already exists, reset its password via `updateUserById` so the known password always works.
- Chat determinism: the E2E web server runs with `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_TITLE_MODEL`, `OPENAI_BASE_URL`, and `OPENAI_RESPONSES_URL` set to empty strings so the mock model is used. Tests assert the exact mock string.
- Auth reuse: use Playwright's setup-project + `storageState` pattern. One `auth.setup.ts` logs in through the real UI once and saves cookies to `e2e/.auth/user.json`; the main authenticated project reuses it via `use.storageState` and `dependencies: ['setup']`.
- Server strategy: Playwright `webServer` runs `next dev` on port `3100` (development mode, required for the mock model). `baseURL` is `http://localhost:3100`. `reuseExistingServer` is enabled locally and disabled in CI.
- Browser scope: Chromium only for this plan. Cross-browser is out of scope.
- No app source changes: tests rely on existing role/aria/text/react-pdf selectors. Do NOT add `data-testid` attributes to `src/` in this plan.
- Env loading in config: add `dotenv` as a dev dependency and load `.env.local` at the top of `playwright.config.ts` so the config and test workers can read Supabase and test-user vars. Do not commit real secrets; only reference env vars.

## Conventions

- After adding or changing dependencies and config, run `npm run build` and `npm run lint` to confirm the repo still builds and lints. TypeScript strict mode is on; no `any` (use `unknown` and narrow). Use named exports.
- Playwright test/config files are TypeScript. Keep them at the repo root (`playwright.config.ts`) and under `e2e/`. These files are outside `src/` so they are not subject to the Feature-Sliced Design import rules, but keep them clean and typed.
- Do not weaken or bypass RLS, and do not use the service-role key anywhere except the dedicated test-user provisioning helper used by the setup project.
- Run E2E locally with `npm run test:e2e`. The first run on a machine also requires the Chromium browser binary (`npx playwright install chromium`); document this in the script/README note but do not attempt to auto-install inside CI without the install step.
- Selector priority: `getByRole` with accessible name, then `aria-label`, then visible text / placeholder, then react-pdf CSS class. Avoid brittle DOM structure selectors.
- Streaming assertions must use Playwright web-first assertions (auto-retry) with an adequate timeout, since the mock reply streams word-by-word.

## Phases

## Phase 1 - Harness and unauthenticated smoke

Status: pending

Objective: Install Playwright, add a typed `playwright.config.ts` that boots its own Next dev server on port 3100 with OpenAI blanked, add npm scripts and gitignore entries, and prove the harness works with an unauthenticated guard spec that needs no login.

Files to touch:
- [package.json](package.json) (add dev dependencies `@playwright/test` and `dotenv`; add scripts `test:e2e` and `test:e2e:ui`).
- `playwright.config.ts` (new, repo root).
- `.gitignore` (add Playwright artifact and auth-state paths).
- `e2e/guards.spec.ts` (new).

Steps:
1. Add dev dependencies `@playwright/test` and `dotenv` using the package manager (latest versions). Do not hand-edit version numbers. After install, note that the executor must also run `npx playwright install chromium` once locally to fetch the browser binary.
2. Add npm scripts: `test:e2e` runs the Playwright CLI test runner; `test:e2e:ui` runs it with the `--ui` flag for interactive debugging.
3. Create `playwright.config.ts` at the repo root. At the very top, load environment variables from `.env.local` using `dotenv` (point it at the repo-root `.env.local`). Configure:
   - `testDir` = `./e2e`.
   - `use.baseURL` = `http://localhost:3100`.
   - `use.trace` = `on-first-retry` (helpful artifacts without bloat).
   - A single project named `chromium` using the Desktop Chrome device descriptor. (The setup/authenticated projects are added in Phase 2; keep this phase to one plain project.)
   - `webServer`: command runs the Next dev server bound to port 3100 (invoke `next dev` with the port flag; Turbopack is fine). Set `url` to `http://localhost:3100`, `reuseExistingServer` to true when not in CI and false in CI, and a `timeout` generous enough for a cold Next dev start (for example 120000 ms). Provide a `webServer.env` object that spreads the current `process.env` and then overrides `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_TITLE_MODEL`, `OPENAI_BASE_URL`, and `OPENAI_RESPONSES_URL` to empty strings so the mock chat model is used. Do not set `NODE_ENV` (letting `next dev` default it to development, which the mock path requires).
   - Enable retries in CI (for example 1 or 2) and 0 locally; enable the HTML reporter.
4. Update `.gitignore` to ignore Playwright outputs and the saved auth state: add `/test-results/`, `/playwright-report/`, `/playwright/.cache/`, and `/e2e/.auth/`.
5. Create `e2e/guards.spec.ts` with two tests that require no authentication:
   - Navigating to `/dashboard` while unauthenticated ends up on `/login` (assert the URL contains `/login`). This exercises the middleware/layout guard and proves the Supabase env booted.
   - Navigating to `/login` shows the heading `Sign in to your account` and a visible button named `Sign in`. This proves the app renders and selectors are correct.

Verification:
- `npm run build` and `npm run lint` pass.
- With no other dev server needed, `npm run test:e2e` starts the port-3100 server and both `guards.spec.ts` tests pass. (Executor must have run `npx playwright install chromium` once.)
- Confirm the Playwright HTML report is generated and that `git status` shows the artifact directories are ignored.

Dependencies: none beyond the existing repo. This phase creates the harness other phases build on.

## Phase 2 - Authentication fixture and storageState

Status: pending

Objective: Provision a dedicated test user idempotently via the Supabase service-role admin API, log that user in through the real login UI once, save the authenticated `storageState`, and wire a setup project plus an authenticated project so later specs run logged in. Add one spec that verifies authenticated access to the dashboard.

Files to touch:
- `e2e/helpers/test-user.ts` (new; service-role provisioning helper).
- `e2e/auth.setup.ts` (new; setup project that logs in and saves state).
- `playwright.config.ts` (edit: add the `setup` project and make `chromium` depend on it and use the saved storageState).
- `e2e/authenticated-access.spec.ts` (new; verification of the authed session).

Steps:
1. In `e2e/helpers/test-user.ts`, export an async function that ensures the test user exists. It reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env, constructs a `@supabase/supabase-js` client with the service-role key and with session persistence and auto-refresh disabled. It resolves the credentials from `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` (fall back to fixed defaults: an obviously-test email and a >=8-char password). It attempts `auth.admin.createUser` with `email_confirm: true`. If creation fails because the user already exists, it locates the existing user (via the admin list/get API, matching on email) and calls `auth.admin.updateUserById` to set the known password and keep the email confirmed. The function returns the resolved `{ email, password }`. Make it safe to call repeatedly (idempotent). Type everything; no `any`.
2. In `e2e/auth.setup.ts`, define a Playwright test (this file is the `setup` project). It first calls the helper from step 1 to ensure the user exists and obtain credentials. Then it navigates to `/login`, fills `#email` and `#password`, clicks the `Sign in` button, and waits for navigation to a URL containing `/dashboard`. As a readiness check, it asserts the `Previewer` nav link is visible. Finally it saves `storageState` to `e2e/.auth/user.json` (create the `e2e/.auth/` directory path as needed).
3. Edit `playwright.config.ts`:
   - Add a `setup` project whose `testMatch` targets `auth.setup.ts`.
   - Change the `chromium` project to set `use.storageState` to `e2e/.auth/user.json` and `dependencies: ['setup']`.
   - Ensure `guards.spec.ts` from Phase 1 still runs unauthenticated. Because that project now carries a storageState, exclude the guard spec from the authenticated project OR give the guards their own project without storageState. Decision: add a separate project named `guards` (no storageState, no dependency) whose `testMatch` targets `guards.spec.ts`, and restrict the `chromium` project to exclude `guards.spec.ts`. This keeps unauthenticated guard tests truly unauthenticated while all other specs run logged in.
4. Create `e2e/authenticated-access.spec.ts` with one test: navigate to `/dashboard`, assert the URL still contains `/dashboard` (no redirect to `/login`), and assert the `Previewer` nav link is visible. This confirms the saved session is honored.

Verification:
- `npm run lint` passes (typed helper, no `any`).
- `npm run test:e2e` runs the `setup` project first, creates `e2e/.auth/user.json`, then the authenticated `authenticated-access.spec.ts` passes and the unauthenticated `guards.spec.ts` still passes.
- Re-running `npm run test:e2e` a second time succeeds without manual cleanup (idempotent provisioning).
- Confirm `e2e/.auth/user.json` is gitignored (from Phase 1) and not staged.

Dependencies: Phase 1 (the `playwright.config.ts`, the `webServer` on port 3100 with OpenAI blanked, the npm scripts, the gitignore entries, and the `guards.spec.ts`). This phase edits that config to add auth projects and adds the login setup and its verification spec.

## Phase 3 - Core authenticated flow spec

Status: pending

Objective: Add the headline end-to-end spec covering the authenticated core flow: dashboard loads with chat and preview, sending a chat message produces the deterministic mock assistant reply, and the PDF preview surface renders.

Files to touch:
- `e2e/dashboard.spec.ts` (new).

Steps:
1. Create `e2e/dashboard.spec.ts` (runs under the authenticated `chromium` project from Phase 2, so it starts logged in via the saved storageState).
2. Test "dashboard loads": navigate to `/dashboard`; assert the `Previewer` nav link is visible; assert the empty-chat heading `Edit your CV in chat` is visible (a fresh test user starts with an empty session); assert the preview toolbar `Refresh` button and the `CV` label are visible.
3. Test "chat message returns the mock reply": navigate to `/dashboard`; focus the chat textarea (`aria-label="Chat message"`), type a short prompt (for example a request to read the CV); submit by pressing Enter or clicking the `Send message` button. Assert the user's message appears (the `You` label plus the typed text is visible). Then assert, with a generous timeout to allow the streamed word-by-word mock to accumulate, that the exact mock string `[mock] OPENAI_* env vars are not set; returning a placeholder.` becomes visible. Optionally assert the `Working` indicator appears while in flight (best-effort, not a hard requirement, since it can be transient).
4. Test "preview surface renders" (can be folded into the dashboard-loads test): after the dashboard is loaded, assert the preview toolbar is present, and, with a long timeout, assert either a `<canvas>` inside `.react-pdf__Page` appears OR the preview status pill shows `Up to date`. Treat the toolbar presence as the hard assertion and the canvas/status as the slower, tolerant assertion, because the first render of a fresh default CV in dev may be slow.
5. Keep the spec resilient: prefer web-first auto-retrying assertions; avoid fixed sleeps; scope preview selectors to the preview panel where possible.

Verification:
- `npm run test:e2e` runs the full suite (setup, guards, authenticated dashboard flow) and all tests pass.
- The chat test reliably observes the mock string, confirming the OpenAI-blanked web server is serving the mock model.
- `npm run build` and `npm run lint` still pass (no app source changed).

Dependencies: Phase 1 (harness, web server, scripts) and Phase 2 (authenticated `chromium` project with `storageState`, the setup/guards project split, and the provisioned test user). This phase only adds a new spec that runs within the authenticated project established in Phase 2.

## Out of scope

- The pgvector RAG feature and the Langfuse/eval work from [.cursor/plans/ai_skills_growth_features_308bce48.plan.md](.cursor/plans/ai_skills_growth_features_308bce48.plan.md). This plan is Playwright-only.
- Cross-browser testing (Firefox, WebKit) and mobile viewports. Chromium only.
- Adding `data-testid` attributes or any other changes to application source under `src/`.
- Testing signup, OAuth, subscription-gated chat, CV editing tools, the CV library, vacancies, or account/billing flows. Only the core login -> dashboard -> chat -> preview flow is covered.
- CI pipeline wiring (GitHub Actions, etc.). The config is CI-aware (retries, `reuseExistingServer`), but adding a CI workflow file is deferred.
- Local Supabase stack setup and database seeding beyond the single admin-provisioned test user.
- Hitting the real OpenAI model in tests; the suite deliberately uses the mock.

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
