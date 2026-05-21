# CVere

A personal CV operating system. One truthful fact base. A chat agent edits the master CV in place; the PDF preview is always live next to it.

## What it is

- **One master CV.** A normalized profile (summary, experience, projects, skills, education, certifications, languages) is the only place facts are written.
- **Chat-driven editing.** A streaming agent at `POST /api/chat` rewrites bullets, edits the summary, and changes template/accent/date formats via tools. It never invents data.
- **Live PDF preview.** Every chat edit re-renders `master.pdf` and re-signs the storage URL.
- **Manual CRUD elsewhere.** Achievements (an inbox of wins) and vacancies (saved JD raw text) are entirely user-driven — no AI calls outside the chat route.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Turbopack, React Compiler) |
| UI | [React](https://react.dev) 19 |
| Database & Auth | [Supabase](https://supabase.com) (Postgres + Auth + RLS) |
| Payments | [Stripe](https://stripe.com) (Checkout, Subscriptions, Customer Portal) |
| AI | [Vercel AI SDK](https://ai-sdk.dev) + `@ai-sdk/openai` (chat agent only) |
| PDF | [@react-pdf/renderer](https://react-pdf.org) |
| Styling | [Tailwind CSS](https://tailwindcss.com) 4 (oklch colors) |
| Components | [shadcn/ui](https://ui.shadcn.com) (Base Nova, Base UI primitives) |
| Email | [React Email](https://react.email) + [Resend](https://resend.com) |
| Server Actions | [next-safe-action](https://next-safe-action.dev) |
| Forms | [React Hook Form](https://react-hook-form.com) + [@hookform/resolvers](https://github.com/react-hook-form/resolvers) |
| URL State | [nuqs](https://nuqs.dev) |
| Validation | [Zod](https://zod.dev) 4 |
| State | [Zustand](https://zustand.dev) (preview store) |
| Language | TypeScript 6 (strict mode) |

## Project Structure

```
src/
├── app/
│   ├── (auth)/                   # login, signup, callback
│   ├── (account)/                # account, manage-subscription
│   ├── (app)/                    # Protected app shell + nav
│   │   ├── dashboard/            # PDF previewer + sidebar (Library + Chat)
│   │   ├── profile/              # Fact-base editor
│   │   ├── achievements/         # Capture + integrate inbox
│   │   ├── vacancies/            # Saved JDs (raw text)
│   │   └── layout.tsx
│   └── api/
│       ├── chat/route.ts         # Streaming chat agent (only AI surface)
│       └── webhooks/route.ts     # Stripe webhooks
├── features/
│   ├── account/                  # Auth, Stripe customer/subscription
│   ├── achievements/             # Manual CRUD inbox
│   ├── chat/                     # Tools, services, storage, system prompt
│   ├── emails/                   # React Email templates
│   ├── jobs/                     # Vacancies (raw text + delete)
│   ├── previewer/                # Master CV renderer + sidebar + preview store
│   └── profile/                  # Fact-base editor
├── components/ui/                # shadcn/ui (Base Nova)
├── libs/
│   ├── ai/                       # chat-model.ts, resumable-stream.ts
│   ├── safe-action.ts
│   ├── stripe/, supabase/, resend/, logger/
├── pdf/                          # @react-pdf/renderer templates
├── config.ts                     # App name & description
├── proxy.ts                      # Middleware (session refresh + route guards)
└── styles/globals.css            # Tailwind v4 + shadcn CSS variables (oklch)
```

Path alias: `@/*` → `./src/*`

## Database Schema

Migrations live in `supabase/migrations/`. RLS is mandatory on every public table.

| Table | Purpose | RLS |
|-------|---------|-----|
| `users` | User profiles (auto-created on signup) | Users read/update own row |
| `customers` | Supabase user → Stripe customer mapping | Private |
| `products`, `prices` | Stripe catalog (synced via webhooks) | Public read-only |
| `subscriptions` | Stripe subscriptions (synced via webhooks) | Users read own rows |
| `profile` | Master CV root (summary + identity/contact) | Owner |
| `experience`, `project`, `skill`, `education`, `certification`, `language` | Ordered profile children | Owner |
| `achievement_log_entry` | Append-only inbox of wins | Owner |
| `job_description` | Saved vacancy raw text | Owner |
| `cv_preferences` | Template, accent, date formats, cached `master_pdf_path` | Owner |
| `chat_message` | Persisted chat history | Owner |

Storage: a private `pdf` bucket holds rendered master CVs at `pdf/{user_id}/master.pdf`. Policies enforce owner-scoped access by path prefix.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- An OpenAI API key (for the chat agent)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd cvere
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Note your Project URL, Anon key, and Service role key from **Project Settings > API**.
3. Reset the database password under **Project Settings > Database**.

### 3. Set up Stripe

1. Note your Publishable and Secret keys from **Developers > API keys**.
2. Activate the [Customer Portal test link](https://dashboard.stripe.com/test/settings/billing/portal).

### 4. Set up Resend

Create an account at [resend.com](https://resend.com) and grab an API key.

### 5. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_PASSWORD=your-db-password

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

RESEND_API_KEY=re_...

OPENAI_API_KEY=sk-...

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 6. Run database migrations

```bash
npx supabase login
npx supabase link --project-ref <your-project-id>
npm run migration:up
```

`migration:up` applies migrations and regenerates `src/libs/supabase/types.ts`.

### 7. Seed Stripe products

```bash
stripe fixtures ./stripe-fixtures.json --api-key <your-stripe-sk>
```

Products and prices sync to Supabase automatically via the webhook.

### 8. Set up the Stripe webhook

**Local development:**

```bash
npm run stripe:listen
```

Copy the displayed webhook signing secret into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

**Production:**

Add a webhook endpoint in Stripe Dashboard > **Developers > Webhooks** pointing to `https://your-app.com/api/webhooks`. Subscribe to `product.*`, `price.*`, `checkout.session.completed`, and `customer.subscription.*`.

### 9. Start development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (flat config) |
| `npm run stripe:listen` | Forward Stripe webhooks to localhost |
| `npm run email:dev` | React Email preview server (port 3001) |
| `npm run email:build` | Build email templates |
| `npm run email:export` | Export email templates to HTML |
| `npm run generate-types` | Regenerate Supabase types |
| `npm run migration:new <name>` | Create a new migration |
| `npm run migration:up` | Run migrations + regenerate types |

## Architecture Notes

- **Chat is the only AI surface.** `src/app/api/chat/route.ts` exposes content tools (read profile, rewrite summary, edit/add/remove bullets) and style tools (template, accent, date formats). Every other feature is manual CRUD.
- **Mutating tools trigger a re-render.** The route detects mutating tool calls in `onStepFinish`, then re-renders the master PDF and emits a `data-preview-dirty` event so the previewer iframe re-signs its URL.
- **Previewer.** The dashboard hosts a PDF iframe (`PreviewerPane`) plus a sidebar (`PreviewerSidebar`) with Library and Chat tabs. The signed URL lives in a Zustand store and is refreshed via the action in `src/features/previewer/actions/sign-pdf-url.ts`.
- **Server actions** use `next-safe-action` with Zod. The authenticated client in `src/libs/safe-action.ts` enforces sessions automatically.
- **Middleware** (`src/proxy.ts`) refreshes Supabase auth cookies and guards `/account`, `/manage-subscription`, `/dashboard`, `/profile`, `/achievements`, `/vacancies`.
- **Strict TypeScript.** No `any`. React Compiler is on — skip manual `memo`/`useMemo`/`useCallback` unless profiling demands it.
- **shadcn/ui (Base Nova)** with `@base-ui/react` primitives. Components use the `render` prop for polymorphism, not `asChild`.

## Customization

### Branding

Update `src/config.ts` with your app name and description. The logo in `src/components/logo.tsx` is text-only; replace it with your own component or image.

### Styling

Theme tokens are in `src/styles/globals.css` (`@theme inline`, oklch). Modify the `:root` and `.dark` sections to change the color scheme. See the [shadcn/ui theming docs](https://ui.shadcn.com/docs/theming).

### Adding shadcn components

```bash
npx shadcn@latest add <component-name>
```

Components are generated to `src/components/ui/`.

## License

MIT
