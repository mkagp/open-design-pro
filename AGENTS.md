# Open Design Hosted

This is the active repository for the hosted Vercel + Convex rewrite.

## Legacy Boundary

- `open-design-legacy/**` is read-only reference material.
- Agents may inspect legacy files to understand prior behavior, product language, or implementation patterns.
- Agents must not edit, format, move, delete, regenerate, or import runtime code from `open-design-legacy/**`.
- New implementation code must live outside `open-design-legacy/`.
- If a legacy idea is reused, copy the relevant behavior into a new active file and adapt it there.
- Do not add a nested guard file inside `open-design-legacy/`; this root file owns the rule.

## Active Architecture

- `apps/web`: Next.js App Router application hosted on Vercel.
- `convex`: Convex backend replacing the local daemon. It owns auth checks, persistence, AI orchestration, S3 access, and provider secret handling.
- `packages/contracts`: shared TypeScript DTOs.
- `packages/artifacts`: generated HTML artifact parsing and manifest helpers.
- `packages/prompts`: prompt composition for hosted AI runs.
- `packages/model-registry`: provider/model metadata helpers.
- `packages/components`: shared React primitives.

## Product Scope

Preserve and build only the hosted product core:

- Clerk-protected employee access through organization membership.
- Design systems.
- Projects.
- Chat sessions.
- Generated HTML artifacts.
- Preview and export.
- Org-shared AI provider/model settings.
- S3-backed artifact and export storage.

Out of scope unless explicitly reintroduced:

- Desktop and packaged apps.
- Local `od` CLI and package CLIs.
- Local agent CLI detection/spawning.
- SQLite, Express daemon, PTYs, sidecars.
- Plugins, MCP, automations/routines.

## Development

Use pnpm through Corepack.

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm --filter @open-design/web build
```

Convex generated files are created by Convex tooling:

```bash
pnpm convex:dev
pnpm convex:deploy
```

Provider API keys are app-managed and stored encrypted. Platform credentials such as Clerk issuer, Convex URL, AWS credentials, KMS key ARN, and S3 bucket name remain deployment environment variables.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
