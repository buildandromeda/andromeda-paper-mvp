-- Seed Andromeda-owned paper MVP events and probability history.
-- Run this after 001_initial_paper_mvp.sql in staging and production.

with seed_events as (
  select *
  from (values
    ('00000000-0000-4000-8000-000000000001'::uuid, 'celtics-beat-knicks-next-game', 'Will Boston beat New York in their next listed game?', 'sports'::event_category, 58.0, 78.0, 'The Odds API', 'Official sportsbook/result feed', 'YES resolves if Boston wins the listed matchup in regulation or overtime.', 'Sports event generated from odds-implied probability with form and injury adjustments.', 14, 15, 0),
    ('00000000-0000-4000-8000-000000000002'::uuid, 'phoenix-above-110-this-week', 'Will Phoenix record a high temperature above 110F this week?', 'weather'::event_category, 46.0, 69.0, 'NOAA NWS + Open-Meteo', 'NOAA observed station data', 'YES resolves if NOAA observation for Phoenix exceeds 110F before the event close.', 'Weather event using latest forecast, climatology, model agreement, and recent trend.', 18, 19, 3),
    ('00000000-0000-4000-8000-000000000003'::uuid, 'next-cpi-above-consensus', 'Will next US CPI print above consensus?', 'economics'::event_category, 41.0, 62.0, 'FRED + BLS', 'BLS official CPI release', 'YES resolves if the reported headline CPI change is above the stored consensus value.', 'Macro event using nowcast, historical surprise distribution, and market-implied proxies.', 22, 23, 6),
    ('00000000-0000-4000-8000-000000000004'::uuid, 'nvda-above-150-by-quarter-end', 'Will NVDA close above $150 by quarter end?', 'stocks'::event_category, 53.0, 74.0, 'FMP + SEC EDGAR', 'FMP official close', 'YES resolves if split-adjusted NVDA close is above $150 on the final trading day.', 'Equity threshold event using market price, volatility, filings/news catalyst, and history.', 26, 27, 9),
    ('00000000-0000-4000-8000-000000000005'::uuid, 'bitcoin-above-120k-by-q3', 'Will Bitcoin trade above $120,000 by the end of Q3?', 'crypto'::event_category, 49.0, 71.0, 'CoinGecko', 'CoinGecko market data', 'YES resolves if BTC/USD trades above $120,000 before the deadline.', 'Crypto threshold event using price momentum, volatility, and historical break behavior.', 30, 31, 12),
    ('00000000-0000-4000-8000-000000000006'::uuid, 'federal-ai-safety-bill-passes-house', 'Will a federal AI safety bill pass the House this session?', 'politics'::event_category, 36.0, 44.0, 'Congress.gov + GDELT', 'Congress.gov official bill status', 'YES resolves if a qualifying AI safety bill passes the US House before session end.', 'Government event using official bill data, news momentum, and legislative history.', 34, 35, 15)
  ) as event_data(id, slug, title, category, probability, confidence, provider, resolution_source, resolution_rule, description, close_days, resolve_days, phase)
)
insert into public.events (
  id,
  slug,
  title,
  category,
  status,
  description,
  resolution_source,
  resolution_rule,
  closes_at,
  resolves_at,
  created_at
)
select
  id,
  slug,
  title,
  category,
  'open',
  description,
  resolution_source,
  resolution_rule,
  now() + (close_days || ' days')::interval,
  now() + (resolve_days || ' days')::interval,
  now() - interval '30 days'
from seed_events
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  category = excluded.category,
  status = excluded.status,
  description = excluded.description,
  resolution_source = excluded.resolution_source,
  resolution_rule = excluded.resolution_rule,
  closes_at = excluded.closes_at,
  resolves_at = excluded.resolves_at;

delete from public.event_sources where event_id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006'
);

delete from public.probability_snapshots where event_id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006'
);

delete from public.market_price_bars where event_id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006'
);

delete from public.event_resolution_rules where event_id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006'
);

with seed_events as (
  select *
  from (values
    ('00000000-0000-4000-8000-000000000001'::uuid, 'sports'::event_category, 58.0, 78.0, 'The Odds API', 'https://api.the-odds-api.com/docs', 0),
    ('00000000-0000-4000-8000-000000000002'::uuid, 'weather'::event_category, 46.0, 69.0, 'NOAA NWS + Open-Meteo', 'https://www.weather.gov/documentation/services-web-api', 3),
    ('00000000-0000-4000-8000-000000000003'::uuid, 'economics'::event_category, 41.0, 62.0, 'FRED + BLS', 'https://fred.stlouisfed.org/docs/api/fred/', 6),
    ('00000000-0000-4000-8000-000000000004'::uuid, 'stocks'::event_category, 53.0, 74.0, 'FMP + SEC EDGAR', 'https://site.financialmodelingprep.com/developer/docs', 9),
    ('00000000-0000-4000-8000-000000000005'::uuid, 'crypto'::event_category, 49.0, 71.0, 'CoinGecko', 'https://www.coingecko.com/en/api', 12),
    ('00000000-0000-4000-8000-000000000006'::uuid, 'politics'::event_category, 36.0, 44.0, 'Congress.gov + GDELT', 'https://api.congress.gov/', 15)
  ) as event_data(event_id, category, probability, confidence, provider, provider_url, phase)
)
insert into public.event_sources (event_id, provider, provider_url, label, last_updated_at, status)
select event_id, provider, provider_url, provider || ' primary signal', now(), case when confidence < 50 then 'stale' else 'fresh' end
from seed_events
union all
select event_id, 'Andromeda Historical Baseline', '/data-sources', 'Historical baseline and category prior', now() - interval '1 day', 'fresh'
from seed_events;

with seed_events as (
  select *
  from (values
    ('00000000-0000-4000-8000-000000000001'::uuid, 'sports'::event_category, 58.0, 78.0, 0),
    ('00000000-0000-4000-8000-000000000002'::uuid, 'weather'::event_category, 46.0, 69.0, 3),
    ('00000000-0000-4000-8000-000000000003'::uuid, 'economics'::event_category, 41.0, 62.0, 6),
    ('00000000-0000-4000-8000-000000000004'::uuid, 'stocks'::event_category, 53.0, 74.0, 9),
    ('00000000-0000-4000-8000-000000000005'::uuid, 'crypto'::event_category, 49.0, 71.0, 12),
    ('00000000-0000-4000-8000-000000000006'::uuid, 'politics'::event_category, 36.0, 44.0, 15)
  ) as event_data(event_id, category, probability, confidence, phase)
),
snapshots as (
  select
    event_id,
    category,
    confidence,
    generate_series(0, 23) as index,
    greatest(5, least(95, probability + sin((generate_series(0, 23) + phase) / 2.4) * 5 + cos((generate_series(0, 23) + phase) / 5.5) * 3)) as probability
  from seed_events
)
insert into public.probability_snapshots (
  event_id,
  probability,
  confidence,
  source_count,
  data_freshness_minutes,
  explanation,
  risk_notes,
  created_at
)
select
  event_id,
  round(probability::numeric, 2),
  greatest(20, least(95, confidence - case when index < 4 then 4 else 0 end)),
  case when confidence < 50 then 2 else 4 end,
  case when confidence < 50 then 260 else 18 + index end,
  case
    when category = 'sports' then 'Odds-implied probability, form, injuries, and historical matchup data are blended.'
    when category = 'weather' then 'Forecast model, climatology, model agreement, and trend signals are blended.'
    when category = 'economics' then 'Consensus, nowcast, historical surprise, and market proxy signals are blended.'
    when category = 'stocks' then 'Price action, volatility, catalyst, and historical threshold behavior are blended.'
    when category = 'crypto' then 'Momentum, volatility, and historical break behavior are blended.'
    else 'Official data, historical baseline, news momentum, and recency signals are blended.'
  end,
  case
    when category = 'sports' then 'Late injuries and lineup news can move the probability quickly.'
    when category = 'weather' then 'Forecast model spread can be wide until the event window is closer.'
    when category = 'economics' then 'Consensus can shift before release and revisions may change interpretation.'
    when category = 'stocks' then 'Volatility and earnings/news catalysts can invalidate technical signals.'
    when category = 'crypto' then 'High volatility and weekend liquidity can cause large probability swings.'
    else 'Official action may be delayed and news sentiment can be noisy.'
  end,
  now() - ((23 - index) || ' days')::interval
from snapshots;

insert into public.market_price_bars (event_id, time, probability, volume)
select
  event_id,
  created_at,
  probability,
  round((2000 + probability * 120)::numeric, 2)
from public.probability_snapshots
where event_id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006'
);

insert into public.event_resolution_rules (event_id, category, provider, rule)
select id, category, resolution_source, jsonb_build_object('rule', resolution_rule, 'conflict_policy', 'needs_review')
from public.events
where id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006'
)
on conflict (event_id) do update set
  category = excluded.category,
  provider = excluded.provider,
  rule = excluded.rule;
