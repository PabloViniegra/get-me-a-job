# Get Me a Job

Automated job-search dashboard. A daily Apify scrape of LinkedIn listings lands in MongoDB,
gets graded against your CV by an OpenRouter LLM, and surfaces in a ranked dashboard.

## Status

Epics 1-3 are functional end-to-end against the real LinkedIn dataset.

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript (strict)
- **Styling:** Tailwind CSS 4, HeroUI v3, IBM Plex Sans/Mono
- **Data:** Prisma + MongoDB
- **API:** tRPC + TanStack Query
- **AI:** OpenRouter (LLM grading)
- **Ingestion:** Apify (`apify-client`)
- **Tooling:** Bun, Biome, Vitest

## Getting started

Requires [Bun](https://bun.sh).

```bash
bun install
```

Create a `.env` (see [`.env.example`](./.env.example) for the full list with defaults). The
required keys are:

```
DATABASE_URL=
ROUTER_API_KEY=
APIFY_API_KEY=
APIFY_WEBHOOK_SECRET=
APIFY_ADMIN_SECRET=
```

Place your CV at `cv/CV_2026.pdf` (gitignored — never committed, never sent to the client).

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command          | Purpose                  |
| ---------------- | ------------------------- |
| `bun dev`        | Dev server                |
| `bun run build`  | Production build          |
| `bun run start`  | Start production server   |
| `bun run lint`   | Biome check                |
| `bun run format` | Biome format (writes)      |
| `bun run test`   | Vitest (single run)        |

## Testing

Vitest. Env parsing and the tRPC router have unit tests; Prisma has a live-DB integration test
(`src/lib/prisma.integration.test.ts`) that requires a valid `DATABASE_URL`.

## Further reading

- [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) — color/type/spacing tokens, component specs, voice.
- [`docs/agents/`](./docs/agents) — issue-tracker and domain-modeling conventions for agents
  working in this repo.

## Deployment

Target is [Vercel](https://vercel.com).
