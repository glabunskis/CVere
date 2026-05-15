# Future plans

Decisions deferred from the [previewer chat tab](./previewer_chat_tab_b4249bcb.plan.md) plan. Revisit when the corresponding trigger fires (volume, paid users, performance pain, etc.). Each item lists the trigger to revisit, the rough scope, and any forward-compatible hooks already in v1.

## Chat product surface

### Multi-session chat (history sidebar, "new chat" button)
- Trigger: users ask for chat history, or chat threads start mixing unrelated topics.
- Scope: add `chat_session` table (`id`, `user_id`, `title`, `created_at`, `updated_at`) and a nullable `session_id uuid references chat_session on delete cascade` column on `chat_message`. Backfill one session per user. Update `chat-message-store` API from `(userId)` to `(sessionId)`. Add a session list UI in the Chat tab.
- v1 hooks: `chatMessageStore` is already the abstraction; the route is the only caller. Singleton key `'chat:singleton'` becomes the session id.

### Tailoring tools and cover-letter tools
- Trigger: master CV editing is stable; users want chat to drive tailored CVs.
- Scope: add tools that operate on `tailored_cv` and `letter` rows. Introduce a tool-side guard so the model picks the right surface based on the active selection.
- v1 hooks: system prompt currently refuses these requests explicitly; remove that clause when adding tools.

### Mobile / narrow-viewport chat
- Trigger: meaningful mobile traffic to `/dashboard`.
- Scope: surface chat in a `Sheet` or `Drawer` below `lg`. The current sidebar disappears entirely below `lg`.
- v1 hooks: none — chat is desktop-only.

### Identity-level field editing (name, email, phone)
- Trigger: explicit user request and a clear UX for confirmation.
- Scope: tools that mutate the `profile` row. Needs an extra confirmation step in the system prompt or client-side approval.
- v1 hooks: system prompt blocks these; tools do not exist.

### Richer bullet operations
- Trigger: users hit awkward editing patterns.
- Scope: `reorderExperienceBullets`, `mergeBullets`, `splitBullet`, `rewriteBulletsBatch`. Same per-(id, index) addressing.

## Subscription / billing

### Multi-tier gating (Free vs Pro vs Enterprise)
- Trigger: launching a Free tier with limited features, or a higher tier with extras.
- Scope: replace `requireActiveSubscription()` with `requireTier('pro')`. Map `prices.metadata.tier` → tier id. Gate individual tools by tier (e.g. Free gets style tools but not content tools).
- v1 hooks: `requireActiveSubscription` is a thin wrapper; call sites already exist and the helper signature is forward-compatible.

### Rate limiting and token caps
- Trigger: any abuse, any cost surprise, or first paying users.
- Scope: per-user messages-per-minute via Upstash rate-limit (Redis is already wired). Cap `maxOutputTokens` on `streamText`. Cap session message count. Per-tier limits when multi-tier ships.
- v1 hooks: Upstash Redis client (`src/libs/redis/redis.ts`) is already in place.

## Storage / data

### Move chat message bodies to Azure Blob
- Trigger: `chat_message.parts` JSONB rows getting fat (rich tool histories, embedded images), or Postgres bloat.
- Scope: add nullable `parts_url text` column on `chat_message`. `chat-message-store.appendMessages` writes JSON to Blob and stores URL; `loadMessages` falls back to fetching Blob when `parts` is null. No app code changes outside the store.
- v1 hooks: `chat-message-store.ts` is the seam. Schema change is a one-column migration.

### Background / fire-and-forget PDF render
- Trigger: end-of-turn render latency (currently a few seconds) becomes annoying.
- Scope: route returns the stream immediately; render runs in `after()` and emits `data-preview-dirty` via a separate channel (e.g. server-sent event from a long-poll endpoint, or write to Redis pub/sub the client subscribes to). Same pattern can apply to `updateProfileSection` so the form save returns instantly.
- v1 hooks: `data-preview-dirty` part already exists; needs a delivery channel for after-stream-close events.

### Render coordination on `master.pdf`
- Trigger: observed inconsistencies from concurrent renders (rare today; one user, sequential turns).
- Scope: per-user lock via Upstash Redis; or a fingerprint check before upload to skip no-op renders.
- v1 hooks: Redis available.

### Profile-form parity for remaining sections
- Trigger: complaints that editing skills / education / certifications / languages doesn't refresh the preview.
- Scope: extend the `applyXyz` services and the safe-action's untouched branches to call `renderAndUploadMasterCv` like summary/experience/project now do.
- v1 hooks: pattern is set; just apply to the remaining branches.

## Observability

### Langfuse OTEL integration
- Trigger: need dashboards, prompt diffing, cost per user, latency tracing.
- Scope: install `@langfuse/otel`, `@langfuse/tracing`, `@opentelemetry/sdk-trace-node`. Register `LangfuseSpanProcessor` once at process start. `experimental_telemetry: { isEnabled: true, ... }` already set on every `streamText` / `generateObject` call — flows to Langfuse with no other code changes. Free cloud tier (50k observations / month) or self-host on Docker.
- v1 hooks: telemetry config + functionId/metadata fields already in place at every call site.

### Alternatives considered (skip unless the trigger above doesn't fit)
- **Sentry** — error tracking + perf, but doesn't capture LLM-specific data (prompts, tool calls, token costs) without extra glue. Pair with Langfuse rather than replacing it.
- **Helicone** — proxy-based; per-org analytics but adds a network hop and per-call cost.
- **Vercel AI SDK Devtools (`@ai-sdk/devtools`)** — useful locally, not a production solution.

## Performance

### Switch `useChat` to incremental request payload
- Trigger: chat histories grow large enough that re-sending the full `UIMessage[]` per turn becomes a bandwidth or latency issue.
- Scope: configure `prepareSendMessagesRequest` on the `DefaultChatTransport` to send only `{ id, message: messages[messages.length - 1] }`. Server still loads history from `chat-message-store` and reconstructs `messages` for `convertToModelMessages`.
- v1 hooks: route already loads history from the store; the change is client-only.

## Internationalization

### Multi-language CV content output
- Trigger: confidence that quality holds in non-English content (model evals, user feedback). Skip if quality drops.
- Scope: drop the English-only clause from the system prompt; let the model match the locale of the existing summary, or take an explicit per-user `language` preference. Add Zod-validated language tag to `cv_preferences`.
- v1 hooks: system prompt is the only enforcement point.

## Reliability

### Stream resume failure modes
- Trigger: users report lost messages on flaky networks despite v1 resume.
- Scope: persist partial assistant turns to `chat_message` periodically (every N tokens / every step), not only in `onFinish`. Reconcile on reload to surface in-flight content even when the resumable-stream cache has expired.
- v1 hooks: `experimental_resume` + Upstash already wired; missing piece is intermediate persistence.
