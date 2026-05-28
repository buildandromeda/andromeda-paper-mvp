import { AppShell } from "@/components/AppShell";

const rows = [
  ["Sports", "The Odds API", "Odds-implied probability, event schedule, result checks"],
  ["Weather", "NOAA/NWS, NOAA CDO, Open-Meteo", "Forecasts, observations, climatology"],
  ["Economics", "FRED, BLS, BEA, Census", "Macro releases, baselines, consensus/nowcast inputs"],
  ["Stocks", "FMP, SEC EDGAR", "Prices, bars, filings, catalyst context"],
  ["Crypto", "CoinGecko", "Spot prices, history, volatility"],
  ["Politics", "FEC, Congress.gov, AP Elections, GDELT", "Official data, bill status, election results, news momentum"],
  ["Entertainment", "TMDB, GDELT", "Watchlist-only trend signals"],
];

export default function DataSourcesPage() {
  return (
    <AppShell>
      <div className="page-heading">
        <span>How our model works</span>
        <h1>Data source transparency</h1>
        <p>Andromeda stores raw snapshots, normalized events, and probability history so users can see where every number came from.</p>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Category</th><th>Sources</th><th>Use</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
