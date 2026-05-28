# Andromeda Paper MVP

Andromeda is a paper prediction-market analysis product. V1 is **paper mode only**:

- no real-money trading
- no Kalshi execution
- no Polymarket execution
- no broker order execution
- no cash rewards
- no claim that Andromeda has a trained proprietary LLM

The local build includes a fully working demo store so the product can be developed before Supabase credentials exist. Production persistence is defined in `supabase/migrations/001_initial_paper_mvp.sql`.

## What Works Locally

- Landing page with waitlist API.
- Demo onboarding and paper account creation.
- Event explorer with Andromeda-owned prediction events.
- Event detail pages with probability history, sources, confidence, and risk notes.
- Paper order engine with validation, positions, cash, P&L, and trade ledger.
- Backtest lab with threshold/crossing rules.
- Strategy saving.
- Andromeda Scout v0.1 scoped model responses.
- Model feedback and reward points.
- Leaderboard.
- Alerts API/UI.
- Legal, risk, support, settings, and data-source transparency pages.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Setup

1. Create two Supabase projects:
   - `andromeda-staging`
   - `andromeda-production`

2. Run:

```sql
-- paste and run:
supabase/migrations/001_initial_paper_mvp.sql
```

3. Create a Vercel project and set the environment variables from `.env.local.example`.

4. Rotate/revoke any Kalshi keys from the old exported zip. Do not copy `.env`, private key, `.venv`, or cache files from the old prototype.

5. Replace the placeholder legal pages with attorney-reviewed Privacy Policy, Terms of Service, and Risk Disclaimer.

## Key Docs

- `docs/launch-checklist.md`
- `docs/api-budget.md`

## Architecture

- Next.js App Router
- TypeScript
- Supabase schema/RLS
- Vercel deployment target
- Resend-ready transactional email env
- Sentry/PostHog-ready env placeholders

The current code uses an in-memory demo store when running locally. The migration and API contracts are structured so Brandon/Krish can swap the store calls to Supabase queries once accounts and keys are available.
