import { describe, expect, it } from "vitest";
import { runProbabilityBacktest } from "@/lib/backtest";
import type { MarketPriceBar } from "@/lib/types";

function bars(count: number): MarketPriceBar[] {
  return Array.from({ length: count }).map((_, index) => ({
    id: `bar_${index}`,
    eventId: "evt_test",
    time: new Date(2026, 0, index + 1).toISOString(),
    probability: 45 + index * 2,
    volume: 1000 + index,
  }));
}

describe("runProbabilityBacktest", () => {
  it("rejects events with too little history", () => {
    expect(() => runProbabilityBacktest("user", bars(5), {
      eventId: "evt_test",
      threshold: 50,
      direction: "crosses_above",
      maxHoldPeriods: 5,
      stopLossPct: 10,
      takeProfitPct: 20,
    })).toThrow("Not enough history");
  });

  it("returns deterministic backtest metrics", () => {
    const result = runProbabilityBacktest("user", bars(20), {
      eventId: "evt_test",
      threshold: 50,
      direction: "crosses_above",
      maxHoldPeriods: 5,
      stopLossPct: 10,
      takeProfitPct: 20,
    });
    expect(result.trades.length).toBeGreaterThan(0);
    expect(result.equityCurve.length).toBe(19);
    expect(result.totalReturnPct).toBeTypeOf("number");
  });
});
