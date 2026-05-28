"use client";

import { useEffect, useRef } from "react";
import { AreaSeries, ColorType, createChart, LineStyle } from "lightweight-charts";
import type { ProbabilitySnapshot } from "@/lib/types";

export function ProbabilityChart({ history }: { history: ProbabilitySnapshot[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#060810" },
        textColor: "#8fa3d6",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      },
      grid: {
        vertLines: { color: "rgba(115, 97, 255, 0.08)", style: LineStyle.Dotted },
        horzLines: { color: "rgba(115, 97, 255, 0.10)", style: LineStyle.Dotted },
      },
      rightPriceScale: {
        borderColor: "rgba(138, 99, 255, 0.24)",
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "rgba(138, 99, 255, 0.24)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(238, 241, 255, 0.62)", style: LineStyle.Dashed },
        horzLine: { color: "rgba(238, 241, 255, 0.34)", style: LineStyle.Dotted },
      },
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#8b5cf6",
      topColor: "rgba(139, 92, 246, 0.34)",
      bottomColor: "rgba(139, 92, 246, 0.02)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${price.toFixed(1)}%`,
      },
    });

    areaSeries.setData(history.map((point) => ({
      time: Math.floor(new Date(point.createdAt).getTime() / 1000) as any,
      value: point.probability,
    })));

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [history]);

  return (
    <div className="chart-card terminal-chart-card" aria-label="TradingView probability history chart">
      <div ref={containerRef} className="chart-mount" />
    </div>
  );
}
