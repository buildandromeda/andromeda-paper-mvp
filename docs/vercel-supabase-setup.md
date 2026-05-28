# Vercel + Supabase Setup

## Supabase

1. Create `andromeda-staging`.
2. Create `andromeda-production`.
3. In each project, open SQL Editor.
4. Run `supabase/migrations/001_initial_paper_mvp.sql`.
5. Copy:
   - Project URL
   - anon public key
   - service role key

Never expose the service role key in client code.

## Vercel

1. Import the GitHub repo.
2. Framework should detect as Next.js.
3. Add env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - provider API keys as they are approved
4. Use preview deployments for staging.
5. Use production deployment for the custom domain.

## Required Before Marketing

- Real domain connected.
- Resend sending domain verified.
- Privacy/Terms/Risk reviewed.
- Support email live.
- Sentry project connected.
- Analytics connected.
- No secrets in repo.
