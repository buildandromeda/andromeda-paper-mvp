import type { EventCategory, PredictionEvent, ProbabilitySnapshot } from "@/lib/types";
import { clamp, confidenceBand } from "@/lib/utils";

type SourceFeatures = {
  oddsImplied?: number;
  recentForm?: number;
  historicalBaseline?: number;
  newsSignal?: number;
  latestForecast?: number;
  climatology?: number;
  modelAgreement?: number;
  recentTrend?: number;
  consensusNowcast?: number;
  historicalSurprise?: number;
  marketProxy?: number;
  macroTrend?: number;
  marketTechnical?: number;
  volatilityBaseline?: number;
  catalyst?: number;
  thresholdHistory?: number;
  officialData?: number;
  filings?: number;
  newsMomentum?: number;
  recency?: number;
};

const CATEGORY_WEIGHTS: Record<EventCategory, Array<[keyof SourceFeatures, number]>> = {
  sports: [["oddsImplied", 0.7], ["recentForm", 0.15], ["historicalBaseline", 0.1], ["newsSignal", 0.05]],
  weather: [["latestForecast", 0.6], ["climatology", 0.2], ["modelAgreement", 0.15], ["recentTrend", 0.05]],
  economics: [["consensusNowcast", 0.45], ["historicalSurprise", 0.3], ["marketProxy", 0.15], ["macroTrend", 0.1]],
  stocks: [["marketTechnical", 0.45], ["volatilityBaseline", 0.25], ["catalyst", 0.15], ["thresholdHistory", 0.15]],
  crypto: [["marketTechnical", 0.45], ["volatilityBaseline", 0.25], ["catalyst", 0.15], ["thresholdHistory", 0.15]],
  politics: [["officialData", 0.4], ["historicalBaseline", 0.25], ["newsMomentum", 0.2], ["recency", 0.15]],
  entertainment: [["newsMomentum", 0.45], ["historicalBaseline", 0.25], ["recency", 0.2], ["newsSignal", 0.1]],
};

export function scoreEvent(
  event: PredictionEvent,
  latest: ProbabilitySnapshot,
  features: SourceFeatures = {},
) {
  const weights = CATEGORY_WEIGHTS[event.category];
  const blended = weights.reduce((sum, [key, weight]) => {
    const fallback = latest.probability;
    return sum + (features[key] ?? fallback) * weight;
  }, 0);
  const freshnessPenalty = latest.dataFreshnessMinutes > 240 ? 12 : latest.dataFreshnessMinutes > 120 ? 6 : 0;
  const confidence = clamp(latest.confidence - freshnessPenalty, 5, 99);
  const probability = clamp(blended, 1, 99);

  return {
    probability: Number(probability.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    band: confidenceBand(confidence),
    sourceCount: latest.sourceCount,
    dataFreshnessMinutes: latest.dataFreshnessMinutes,
    explanation: latest.explanation,
    riskNotes: latest.riskNotes,
    weights: Object.fromEntries(weights),
  };
}

export function answerPrompt(prompt: string, event?: PredictionEvent, latest?: ProbabilitySnapshot) {
  const normalized = prompt.toLowerCase();
  if (!event || !latest) {
    return {
      confidence: 35,
      answer:
        "I can answer event-specific questions, portfolio questions, strategy generation, backtest explanation, and event comparisons. Pick an event first so I can ground the response in stored data.",
    };
  }

  const score = scoreEvent(event, latest);
  const calculation = latest.calculation
    ? `Probability source: ${latest.calculation.provider}. Formula: ${latest.calculation.formula}. Inputs: ${latest.calculation.inputs.map((input) => `${input.label}=${input.value}`).join(", ")}.`
    : `Probability source: stored snapshot. ${score.explanation}`;

  if (normalized.includes("strategy") || normalized.includes("rule")) {
    return {
      confidence: score.confidence,
      answer: `Strategy rule: paper-buy YES on ${event.title} if probability crosses above ${Math.max(50, Math.round(score.probability - 3))}% with confidence above 60. Exit if probability falls 8 points from entry or if the event enters stale-data status. ${calculation}`,
    };
  }
  if (normalized.includes("risk")) {
    return {
      confidence: score.confidence,
      answer: `Main risk: ${score.riskNotes} Current confidence is ${score.confidence}% because the event has ${score.sourceCount} sources and data freshness of ${score.dataFreshnessMinutes} minutes.`,
    };
  }
  if (normalized.includes("compare")) {
    return {
      confidence: score.confidence,
      answer: `Comparison mode: ${event.title} currently sits at ${score.probability}% with ${score.band} confidence. Compare it against another event by opening that event detail page and running Scout again.`,
    };
  }

  return {
    confidence: score.confidence,
    answer: `${event.title} is currently modeled at ${score.probability}% with ${score.band} confidence. ${calculation} Risk note: ${score.riskNotes}`,
  };
}

export async function answerPromptAsync(prompt: string, event?: PredictionEvent, latest?: ProbabilitySnapshot) {
  const fallback = answerPrompt(prompt, event, latest);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      confidence: fallback.confidence,
      answer: `[Local fallback: add OPENAI_API_KEY to enable Scout chat.] ${fallback.answer}`,
    };
  }

  if (!event || !latest) {
    return fallback;
  }

  const scope = [
    "Ask about a specific event",
    "Ask about current paper portfolio",
    "Generate strategy rules from plain English",
    "Explain a backtest result",
    "Compare two events",
  ].join("; ");

  const context = {
    event: {
      title: event.title,
      category: event.category,
      description: event.description,
      status: event.status,
      closesAt: event.closesAt,
      resolutionSource: event.resolutionSource,
      resolutionRule: event.resolutionRule,
    },
    probability: {
      value: latest.probability,
      confidence: latest.confidence,
      sourceCount: latest.sourceCount,
      dataFreshnessMinutes: latest.dataFreshnessMinutes,
      explanation: latest.explanation,
      riskNotes: latest.riskNotes,
      calculation: latest.calculation ?? null,
    },
  };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are Andromeda Scout v0.1. You explain paper prediction-market events using only the provided event context. You must not invent probabilities, sources, odds, API data, returns, or backtest results. If the user asks out of scope, politely say Scout V1 only supports: " + scope + ". Keep answers concise, direct, and practical.",
          },
          {
            role: "user",
            content: JSON.stringify({ prompt, context }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        confidence: fallback.confidence,
        answer: `[OpenAI request failed: ${response.status}. Using local fallback.] ${fallback.answer} ${text.slice(0, 160)}`,
      };
    }

    const json = await response.json();
    const text = extractResponseText(json);
    return {
      confidence: fallback.confidence,
      answer: text || fallback.answer,
    };
  } catch (error) {
    return {
      confidence: fallback.confidence,
      answer: `[OpenAI request failed locally. Using local fallback.] ${fallback.answer}`,
    };
  }
}

function extractResponseText(json: any) {
  if (typeof json.output_text === "string") return json.output_text;
  const output = Array.isArray(json.output) ? json.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === "string") return part.text;
    }
  }
  return "";
}
