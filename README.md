# Open Design Hosted

Hosted Open Design is a Vercel + Convex rewrite of the previous local-first app.

The prior codebase is archived under `open-design-legacy/` and is read-only reference material. Active implementation code lives at the repository root in `apps/`, `convex/`, and `packages/`.

## Stack

- Next.js App Router on Vercel.
- Clerk organization authentication.
- Convex backend functions, persistence, scheduling, and subscriptions.
- Vercel AI SDK for provider-agnostic model execution.
- Amazon S3 for generated HTML artifacts and exports.
- AWS KMS envelope encryption for org-shared provider API keys.

## Setup

```bash
corepack enable
corepack pnpm install
cp .env.example .env.local
corepack pnpm convex:dev
corepack pnpm dev
```

Required deployment environment variables are listed in `.env.example`.

## Validation

```bash
corepack pnpm typecheck
corepack pnpm --filter @open-design/web build
```
