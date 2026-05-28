# Launch Checklist

## Legal and Founder Gates

- [ ] Co-founder agreement signed.
- [ ] 4-year vesting with 1-year cliff agreed.
- [ ] IP assignment signed.
- [ ] Privacy Policy published.
- [ ] Terms of Service published.
- [ ] Risk disclaimer published.
- [ ] Cash rewards disabled until legal review.

## Secrets

- [ ] Rotate/revoke Kalshi keys from the exported zip.
- [ ] No `.env`, `.key`, `.pem`, `.venv`, or API key files committed.
- [ ] Staging and production have separate Supabase projects.
- [ ] Vercel env vars set for staging and production.

## Product

- [ ] Auth works.
- [ ] Onboarding creates paper account.
- [ ] Event explorer loads.
- [ ] Event detail shows sources and probability history.
- [ ] Paper orders validate cash/positions.
- [ ] Backtest handles fewer than 10 snapshots.
- [ ] Model chat stays in V1 scope.
- [ ] Alerts can be created/listed/deleted.
- [ ] Leaderboard formula is visible internally.
- [ ] Support link works.

## Monitoring

- [ ] PostHog configured.
- [ ] Sentry configured.
- [ ] Vercel logs reviewed after smoke test.
- [ ] Resend verified for app domain.
