# API Budget Tracker

Before production launch, Avi should copy this into a spreadsheet and fill in account-specific limits.

| Provider | Category | V1 Use | Free limit | Paid trigger | Planned frequency | Fallback |
| --- | --- | --- | --- | --- | --- | --- |
| The Odds API | Sports | Odds-implied probabilities and results | TBD | Sports request volume | Every 15-60 min for active events | Cached odds with stale label |
| NOAA/NWS | Weather | Forecasts, alerts, observations | Public fair use | High request volume | Every 30-60 min | Cached NOAA + Open-Meteo fallback |
| NOAA CDO | Weather | Historical climatology | Token required | Monthly request volume | Daily | Cached climatology |
| Open-Meteo | Weather | Forecast fallback | Generous free tier | Commercial/high use | Every 30-60 min fallback | Cached forecast |
| FRED | Economics | Macro series | API key free | Rare | Daily or release days | Cached macro data |
| BLS | Economics | CPI/jobs releases | Free registration | High volume | Release days | Cached official release |
| BEA | Economics | GDP/PCE data | Free registration | High volume | Release days | Cached official release |
| Census | Economics | Population/economic baselines | Public API | High volume | Weekly/monthly | Cached baseline |
| FMP | Stocks | Prices, historical bars | Account tier dependent | Quote volume | 15-60 min active events | Cached prices with stale label |
| SEC EDGAR | Stocks | Filings/catalysts | Fair access limits | Aggressive scraping | Daily | Cached filings |
| CoinGecko | Crypto | Spot prices/history | Tier dependent | Request volume | 5-15 min active crypto events | Cached prices |
| FEC | Politics | Campaign finance data | API key free | Request volume | Daily/weekly | Cached filings |
| Congress.gov | Politics | Bill status | API key free | Request volume | Daily | Cached bill status |
| AP Elections | Politics | Election results | Approval/paid likely | Contract needed | Election periods | Disable AP-sourced events |
| GDELT | News | News momentum | Public | Query volume | Hourly/daily | Cached momentum |
| TMDB | Entertainment | Media trend/watchlist data | API key free | Commercial limits | Daily | Cached trends |
