# Andromeda API Key Setup

This is the exact key checklist for the rebuilt Paper MVP.

## Local file

1. Open PowerShell.
2. Run:

```powershell
cd C:\Users\sazmaien\Documents\andromeda
notepad .env.local
```

3. Paste your keys in this shape. Leave a line blank if you do not have that key yet.

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini

THE_ODDS_API_KEY=your_the_odds_api_key
FMP_API_KEY=your_fmp_key
FRED_API_KEY=your_fred_key
BLS_API_KEY=your_bls_key
BEA_API_KEY=your_bea_key
NOAA_CDO_TOKEN=your_noaa_token
CONGRESS_API_KEY=your_congress_key
FEC_API_KEY=your_fec_key
TMDB_API_KEY=your_tmdb_key
COINGECKO_API_KEY=your_coingecko_key
```

4. Save Notepad.
5. Restart the dev server:

```powershell
taskkill /IM node.exe /F
npm run dev
```

## Vercel

1. Open your Vercel project.
2. Click `Environment Variables`.
3. Click `Add New`.
4. Put one variable name in `Key`, for example `OPENAI_API_KEY`.
5. Put the actual secret in `Value`.
6. Keep environment set to `Production and Preview`.
7. Click `Save`.
8. Repeat for every key above.
9. Go to `Deployments`.
10. Click the newest deployment.
11. Click the three dots.
12. Click `Redeploy`.

## Where to get keys

- OpenAI: create an API key in the OpenAI platform dashboard. The app uses the Responses API endpoint `https://api.openai.com/v1/responses`.
- The Odds API: create an account at The Odds API and copy the sports odds API key. This unlocks real upcoming sports markets.
- Open-Meteo: no key required for the current weather forecast adapter.
- CoinGecko: optional key. Public simple-price calls work, but a key improves limits.
- FMP: sign in to Financial Modeling Prep, then copy the key from Dashboard > API Keys.
- FRED: request a FRED API key for official economic time-series data.
- BLS: register for BLS API 2.0 if you want higher limits; basic public access can work for limited use.
- BEA: register for a BEA UserID/API key for official GDP and national accounts data.
- NOAA CDO: request a Climate Data Online token for official observed weather resolution.
- Congress.gov: sign up for an api.data.gov key for legislative data.
- FEC: sign up for an OpenFEC key for campaign finance data.
- TMDB: create a TMDB developer API key for entertainment/watchlist signals.

## What works without paid keys

- Weather events from Open-Meteo.
- Crypto events from CoinGecko public API.
- Stock threshold events from delayed Stooq history.
- Politics/economics/media momentum from GDELT.

Sports are hidden until `THE_ODDS_API_KEY` is set. That is intentional so we do not show fake Lakers/NBA-style events.
