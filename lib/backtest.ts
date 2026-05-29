import type { BacktestConfig, BacktestResult, MarketPriceBar } from "@/lib/types";
import { newId, nowIso } from "@/lib/utils";

export function runProbabilityBacktest(
  userId: string,
  bars: MarketPriceBar[],
  config: BacktestConfig,
): BacktestResult {
  const sortedBars = [...bars].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (sortedBars.length < 10) {
    throw new Error("Not enough history: at least 10 probability snapshots are required.");
  }

  let cash = 10000;
  let position: { entryPrice: number; entryTime: string; periods: number } | null = null;
  let peak = cash;
  let maxDrawdownPct = 0;
  const equityCurve: BacktestResult["equityCurve"] = [];
  const trades: BacktestResult["trades"] = [];

  for (let index = 1; index < sortedBars.length; index += 1) {
    const previous = sortedBars[index - 1];
    const current = sortedBars[index];
    const price = current.probability / 100;
    const signal = shouldEnter(previous.probability, current.probability, config);

    if (!position && signal) {
      position = { entryPrice: price, entryTime: current.time, periods: 0 };
    } else if (position) {
      position.periods += 1;
      const pnlPct = ((price - position.entryPrice) / position.entryPrice) * 100;
      const shouldExit =
        position.periods >= config.maxHoldPeriods ||
        pnlPct <= -Math.abs(config.stopLossPct) ||
        pnlPct >= Math.abs(config.takeProfitPct);

      if (shouldExit) {
        const tradePnl = 1000 * (price - position.entryPrice);
        cash += tradePnl;
        trades.push({
          entryTime: position.entryTime,
          exitTime: current.time,
          entryPrice: Number(position.entryPrice.toFixed(4)),
          exitPrice: Number(price.toFixed(4)),
          pnl: Number(tradePnl.toFixed(2)),
        });
        position = null;
      }
    }

    peak = Math.max(peak, cash);
    const drawdown = ((cash - peak) / peak) * 100;
    maxDrawdownPct = Math.min(maxDrawdownPct, drawdown);
    equityCurve.push({ time: current.time, value: Number(cash.toFixed(2)) });
  }

  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const totalReturnPct = ((cash - 10000) / 10000) * 100;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const averageHoldPeriods = trades.length
    ? sortedBars.length / Math.max(1, trades.length)
    : 0;
  const sharpeLike = trades.length
    ? totalReturnPct / Math.max(1, Math.abs(maxDrawdownPct))
    : 0;

  return {
    id: newId("bt"),
    userId,
    config,
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    sharpeLike: Number(sharpeLike.toFixed(2)),
    averageHoldPeriods: Number(averageHoldPeriods.toFixed(2)),
    equityCurve,
    trades,
    sampleSize: sortedBars.length,
    dataStart: sortedBars[0]?.time,
    dataEnd: sortedBars.at(-1)?.time,
    assumptions: [
      "Uses only stored/provider-derived probability bars available before each simulated decision.",
      "Each trade uses a fixed $1,000 notional paper size.",
      "This is not a prediction of future profit and does not include fees, slippage, or taxes.",
    ],
    createdAt: nowIso(),
  };
}

function shouldEnter(previous: number, current: number, config: BacktestConfig) {
  switch (config.direction) {
    case "above":
      return current > config.threshold;
    case "below":
      return current < config.threshold;
    case "crosses_above":
      return previous <= config.threshold && current > config.threshold;
    case "crosses_below":
      return previous >= config.threshold && current < config.threshold;
  }
}
