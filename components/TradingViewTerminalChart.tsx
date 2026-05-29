"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineStyle,
} from "lightweight-charts";

type TerminalChartPoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function TradingViewTerminalChart({
  seed = 58.2,
  label = "ANDROMEDA PAPER INDEX",
  probability,
}: {
  seed?: number;
  label?: string;
  probability?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const data = useMemo(() => buildCandles(probability ?? seed), [probability, seed]);
  const last = data[data.length - 1];
  const previous = data[data.length - 2];
  const change = last && previous ? last.close - previous.close : 0;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#05070d" },
        textColor: "#eef2ff",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      },
      grid: {
        vertLines: { color: "rgba(95, 106, 140, 0.10)", style: LineStyle.Dotted },
        horzLines: { color: "rgba(95, 106, 140, 0.10)", style: LineStyle.Dotted },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 12,
      },
      crosshair: {
        vertLine: { color: "rgba(238, 241, 255, 0.66)", style: LineStyle.Dashed },
        horzLine: { color: "rgba(238, 241, 255, 0.32)", style: LineStyle.Dotted },
      },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#00c978",
      downColor: "#ff303f",
      borderUpColor: "#00c978",
      borderDownColor: "#ff303f",
      wickUpColor: "#00c978",
      wickDownColor: "#ff303f",
    });

    candles.setData(data.map((item) => ({
      time: item.time as any,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    })));

    const volume = chart.addSeries(HistogramSeries, {
      color: "rgba(0, 201, 120, 0.35)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    volume.setData(data.map((item) => ({
      time: item.time as any,
      value: item.volume,
      color: item.close >= item.open ? "rgba(0, 201, 120, 0.38)" : "rgba(255, 48, 63, 0.34)",
    })));

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [data]);

  return (
    <section className="terminal-chart-shell">
      <div className="terminal-chart-toolbar">
        <div className="symbol-line">
          <span className="asset-badge">A</span>
          <strong>{label}</strong>
          <span>PROBABILITY</span>
          <span>PAPER</span>
        </div>
        <div className="chart-tools">
          <button>15M</button>
          <button>Indicators</button>
          <button>Alerts</button>
        </div>
      </div>
      <div className="trade-strip">
        <button className="buy-button">BUY</button>
        <button className="sell-button">SELL</button>
        <span className="ohlc-line">
          C {last?.close.toFixed(2)}% <b className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? "+" : ""}{change.toFixed(2)} pts</b>
        </span>
      </div>
      <div ref={containerRef} className="terminal-chart-mount" />
    </section>
  );
}

function buildCandles(seed: number): TerminalChartPoint[] {
  const start = Math.floor((Date.now() - 1000 * 60 * 72) / 1000);
  let price = Math.max(5, Math.min(95, seed - 4.8));
  return Array.from({ length: 72 }).map((_, index) => {
    const wave = Math.sin(index / 5.2) * 0.62 + Math.cos(index / 9.4) * 0.46;
    const drift = index > 28 ? 0.09 : -0.015;
    const shock = index === 33 ? 3.3 : index === 48 ? -2.8 : 0;
    const open = price;
    const close = Math.max(1, Math.min(99, open + wave + drift + shock));
    const high = Math.min(99, Math.max(open, close) + 0.55 + Math.abs(Math.sin(index)) * 0.85);
    const low = Math.max(1, Math.min(open, close) - 0.55 - Math.abs(Math.cos(index)) * 0.75);
    price = close;
    return {
      time: start + index * 60,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.round(120000 + Math.abs(close - open) * 90000 + (index % 9) * 7000),
    };
  });
}
