# CVere

A clean SaaS app built with Next.js, Supabase, and Stripe. Handles authentication, subscription billing, webhook synchronization, and transactional emails out of the box so you can focus on building your product.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Turbopack, React Compiler) |
| UI | [React](https://react.dev) 19 |
| Database & Auth | [Supabase](https://supabase.com) (Postgres + Auth + RLS) |
| Payments | [Stripe](https://stripe.com) (Checkout, Subscriptions, Customer Portal) |
| Styling | [Tailwind CSS](https://tailwindcss.com) 4 (oklch colors) |
| Components | [shadcn/ui](https://ui.shadcn.com) (Base Nova style, Base UI primitives) |
| Email | [React Email](https://react.email) + [Resend](https://resend.com) |
| Server Actions | [next-safe-action](https://next-safe-action.dev) (type-safe, validated, middleware-powered) |
| Forms | [React Hook Form](https://react-hook-form.com) + [@hookform/resolvers](https://github.com/react-hook-form/resolvers) |
| URL State | [nuqs](https://nuqs.dev) (type-safe search params) |
| Validation | [Zod](https://zod.dev) 4 |
| Analytics | [Vercel Analytics](https://vercel.com/analytics) |
| Language | TypeScript 6 (strict mode) |
| Linting | ESLint 9 (flat config) + Prettier 3 |

## Features

- **Email authentication** -- email + password login via Supabase Auth (with email confirmation on signup)
- **Type-safe server actions** -- `next-safe-action` with Zod validation, auth middleware, and composable action clients
- **Form validation** -- React Hook Form with Zod resolver for client-side validation sharing schemas with server actions
- **URL state management** -- `nuqs` adapter ready for type-safe search params (filters, pagination, tabs)
- **React Compiler** -- automatic component rendering optimization, no manual memoization needed
- **Middleware route guards** -- unauthenticated users redirected before pages render
- **Session refresh** -- Supabase middleware keeps auth cookies in sync
- **Subscription billing** -- Stripe Checkout for subscriptions, Customer Portal for management
- **Webhook sync** -- Stripe products, prices, and subscriptions mirrored to Supabase
- **Row-level security** -- users access only their own data; products/prices are public read-only
- **Transactional emails** -- React Email templates sent via Resend
- **Loading & error states** -- `loading.tsx` and `error.tsx` boundaries at every level
- **Responsive layout** -- mobile menu, desktop navigation
- **Clean defaults** -- minimal styling using shadcn/ui, ready for customization

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                # Root layout (Geist fonts, header, footer, analytics)
│   ├── page.tsx                  # Landing page (hero, features, CTA)
│   ├── navigation.tsx            # Auth-aware header navigation
│   ├── loading.tsx               # Root loading spinner
│   ├── error.tsx                 # Root error boundary
│   ├── (auth)/                   # Auth route group
│   │   ├── login/page.tsx        # Login page
│   │   ├── signup/page.tsx       # Signup page
│   │   ├── auth-page.tsx         # Shared auth page logic
│   │   ├── auth-ui.tsx           # Email + password auth form
│   │   ├── auth-actions.ts       # Safe actions (signInWithPassword, signUpWithPassword, signInWithOAuth, signOut)
│   │   └── auth/callback/
│   │       └── route.ts          # OAuth + email confirmation callback handler
│   ├── (account)/                # Protected route group
│   │   ├── account/
│   │   │   ├── page.tsx          # Account dashboard
│   │   │   └── loading.tsx       # Account loading skeleton
│   │   └── manage-subscription/
│   │       └── route.ts          # Stripe Customer Portal redirect
│   └── api/webhooks/
│       └── route.ts              # Stripe webhook handler
│
├── features/
│   ├── account/controllers/      # Auth & account data fetching
│   │   ├── get-session.ts
│   │   ├── get-user.ts
│   │   ├── get-subscription.ts
│   │   ├── get-customer-id.ts
│   │   ├── get-or-create-customer.ts
│   │   └── upsert-user-subscription.ts
│   └── emails/
│       ├── welcome.tsx           # Welcome email template
│       └── tailwind.config.ts    # Email-specific Tailwind config
│
├── components/
│   ├── ui/                       # shadcn/ui components (Base Nova)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── sheet.tsx
│   │   └── sonner.tsx
│   ├── account-menu.tsx          # User dropdown (Account, Log Out)
│   └── logo.tsx                  # App logo
│
├── lib/
│   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
│
│
├── libs/
│   ├── safe-action.ts            # next-safe-action clients (base + authenticated)
│   ├── supabase/
│   │   ├── supabase-server-client.ts
│   │   ├── supabase-admin.ts
│   │   ├── supabase-middleware-client.ts
│   │   └── types.ts              # Auto-generated Supabase types
│   ├── stripe/
│   │   ├── stripe-admin.ts
│   │   ├── upsert-product.ts     # Sync Stripe product to Supabase
│   │   └── upsert-price.ts       # Sync Stripe price to Supabase
│   └── resend/
│       └── resend-client.ts
│
├── types/
│   └── stripe.ts                 # Subscription, Product, Price types
│
├── utils/
│   ├── get-env-var.ts
│   ├── get-url.ts
│   └── to-date-time.ts
│
├── config.ts                     # App name & description
├── proxy.ts                      # Middleware (session refresh + route guards)
└── styles/
    └── globals.css               # Tailwind v4 + shadcn/ui CSS variables (oklch)
```

## Database Schema

The initial migration creates five tables with row-level security:

| Table | Purpose | RLS |
|-------|---------|-----|
| `users` | User profiles. Auto-created on signup via trigger. | Users read/update own row |
| `customers` | Maps Supabase user IDs to Stripe customer IDs. | Private |
| `products` | Stripe products synced via webhooks. | Public read-only |
| `prices` | Stripe prices synced via webhooks. | Public read-only |
| `subscriptions` | Stripe subscriptions synced via webhooks. | Users read own rows |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20+ (or [Bun](https://bun.sh))
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd cvere
npm install   # or bun install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** and note your Project URL, Anon key, and Service role key
3. Go to **Project Settings > Database** and reset the database password

### 3. Set Up Stripe

1. Create a project at [stripe.com](https://stripe.com)
2. Go to **Developers > API keys** and note your Publishable key and Secret key
3. Activate the [Customer Portal test link](https://dashboard.stripe.com/test/settings/billing/portal)

### 4. Set Up Resend

1. Create an account at [resend.com](https://resend.com)
2. Create an API key at the [API Keys page](https://resend.com/api-keys)

### 5. Configure Environment Variables

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

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 6. Run Database Migrations

```bash
npx supabase login
npx supabase link --project-ref <your-project-id>
npm run migration:up
```

### 7. Seed Stripe Products

```bash
stripe fixtures ./stripe-fixtures.json --api-key <your-stripe-sk>
```

Products and prices sync to Supabase automatically via the webhook.

### 8. Set Up the Stripe Webhook

**Local development:**

```bash
npm run stripe:listen
```

Copy the displayed webhook signing secret into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

**Production:**

Add a webhook endpoint in Stripe Dashboard > **Developers > Webhooks** pointing to `https://your-app.com/api/webhooks`. Select events: `product.*`, `price.*`, `checkout.session.completed`, `customer.subscription.*`.

### 9. Start Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run stripe:listen` | Forward Stripe webhooks to localhost |
| `npm run email:dev` | Start React Email preview server (port 3001) |
| `npm run email:build` | Build email templates |
| `npm run email:export` | Export email templates to HTML |
| `npm run generate-types` | Regenerate Supabase TypeScript types |
| `npm run migration:new <name>` | Create a new migration |
| `npm run migration:up` | Run migrations + regenerate types |

## Customization

### Branding

Update `src/config.ts` with your app name and description. The logo in `src/components/logo.tsx` is text-only by default -- replace it with your own logo component or image.

### Styling

This app uses shadcn/ui (Base Nova style) with oklch CSS variables defined in `src/styles/globals.css`. Modify the `:root` and `.dark` sections to change the color scheme. See the [shadcn/ui theming docs](https://ui.shadcn.com/docs/theming).

### Adding Components

```bash
npx shadcn@latest add <component-name>
```

Components are generated to `src/components/ui/` using Base UI primitives.

### Adding OAuth Providers

The auth server actions in `src/app/(auth)/auth-actions.ts` include `signInWithOAuth` supporting Google and GitHub. To enable OAuth, configure providers in your [Supabase Auth settings](https://supabase.com/docs/guides/auth#providers) and add OAuth buttons to `src/app/(auth)/auth-ui.tsx`.

### Adding a Pricing Page

The Stripe webhook handler syncs products and prices to your database. Build a pricing page by querying the `products` and `prices` tables and creating Stripe Checkout sessions via the `stripeAdmin` client.

## Architecture Notes

- **React Compiler** is enabled in `next.config.ts` for automatic rendering optimization.
- **Middleware** (`src/proxy.ts`) refreshes Supabase auth cookies and guards `/account` and `/manage-subscription` routes.
- **Server components** are the default. Client components are used only where interactivity is needed.
- **Server actions** use `next-safe-action` with Zod schema validation and composable middleware. An authenticated action client in `src/libs/safe-action.ts` checks the session automatically.
- **Webhook handler** validates the Stripe signature, then upserts data to Supabase using the admin client.
- **shadcn/ui** uses the Base Nova style with `@base-ui/react` primitives. Components use the `render` prop for polymorphism (not `asChild`).
- **`@/*` path alias** maps to `./src/*`.

## License

MIT
