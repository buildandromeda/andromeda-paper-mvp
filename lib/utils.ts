import type { ConfidenceBand } from "@/lib/types";

export const DEMO_USER_ID = "demo-user";

export function nowIso() {
  return new Date().toISOString();
}

export function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 75) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}

export function yesPriceFromProbability(probability: number) {
  return clamp(probability / 100, 0.01, 0.99);
}

export function noPriceFromProbability(probability: number) {
  return clamp(1 - yesPriceFromProbability(probability), 0.01, 0.99);
}

export function dollars(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function pct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
