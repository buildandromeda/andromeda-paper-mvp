export const DATA_PROVIDERS = [
  { id: "odds", name: "The Odds API", category: "sports", env: "THE_ODDS_API_KEY" },
  { id: "noaa", name: "NOAA/NWS", category: "weather", env: null },
  { id: "noaa-cdo", name: "NOAA CDO", category: "weather", env: "NOAA_CDO_TOKEN" },
  { id: "open-meteo", name: "Open-Meteo", category: "weather", env: null },
  { id: "fred", name: "FRED", category: "economics", env: "FRED_API_KEY" },
  { id: "bls", name: "BLS", category: "economics", env: "BLS_API_KEY" },
  { id: "bea", name: "BEA", category: "economics", env: "BEA_API_KEY" },
  { id: "census", name: "Census", category: "economics", env: null },
  { id: "fmp", name: "Financial Modeling Prep", category: "stocks", env: "FMP_API_KEY" },
  { id: "sec-edgar", name: "SEC EDGAR", category: "stocks", env: null },
  { id: "coingecko", name: "CoinGecko", category: "crypto", env: "COINGECKO_API_KEY" },
  { id: "fec", name: "FEC", category: "politics", env: "FEC_API_KEY" },
  { id: "congress", name: "Congress.gov", category: "politics", env: "CONGRESS_API_KEY" },
  { id: "ap-elections", name: "AP Elections", category: "politics", env: "AP_ELECTIONS_API_KEY" },
  { id: "gdelt", name: "GDELT", category: "politics", env: null },
  { id: "tmdb", name: "TMDB", category: "entertainment", env: "TMDB_API_KEY" },
] as const;

export function providerStatus() {
  return DATA_PROVIDERS.map((provider) => ({
    ...provider,
    configured: provider.env ? Boolean(process.env[provider.env]) : true,
  }));
}
