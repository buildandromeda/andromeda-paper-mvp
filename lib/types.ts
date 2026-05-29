export type EventCategory =
  | "sports"
  | "weather"
  | "economics"
  | "stocks"
  | "crypto"
  | "politics"
  | "entertainment";

export type EventStatus = "open" | "closed" | "resolved" | "needs_review";
export type ConfidenceBand = "high" | "medium" | "low";
export type TradeSide = "yes" | "no";
export type OrderAction = "buy" | "sell";

export type EventSource = {
  id: string;
  eventId: string;
  provider: string;
  providerUrl: string;
  label: string;
  lastUpdatedAt: string;
  status: "fresh" | "stale" | "down";
};

export type ProbabilitySnapshot = {
  id: string;
  eventId: string;
  probability: number;
  confidence: number;
  sourceCount: number;
  dataFreshnessMinutes: number;
  explanation: string;
  riskNotes: string;
  createdAt: string;
  calculation?: {
    provider: string;
    sourceUrl: string;
    formula: string;
    inputs: Array<{ label: string; value: string }>;
    warnings: string[];
    isProviderBacked: boolean;
  };
};

export type MarketPriceBar = {
  id: string;
  eventId: string;
  time: string;
  probability: number;
  volume: number;
};

export type PredictionEvent = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  description: string;
  resolutionSource: string;
  resolutionRule: string;
  closesAt: string;
  resolvesAt: string;
  outcome?: TradeSide;
  createdAt: string;
  tradeable?: boolean;
  providerBacked?: boolean;
  sourceWarnings?: string[];
};

export type PaperAccount = {
  userId: string;
  cash: number;
  startingCash: number;
  createdAt: string;
};

export type PaperPosition = {
  id: string;
  userId: string;
  eventId: string;
  side: TradeSide;
  quantity: number;
  avgPrice: number;
  updatedAt: string;
};

export type PaperTrade = {
  id: string;
  userId: string;
  eventId: string;
  action: OrderAction;
  side: TradeSide;
  quantity: number;
  price: number;
  notional: number;
  realizedPnl?: number;
  createdAt: string;
  note: string;
};

export type Strategy = {
  id: string;
  userId: string;
  name: string;
  description: string;
  eventCategory: EventCategory | "all";
  rule: string;
  createdAt: string;
};

export type BacktestConfig = {
  eventId: string;
  threshold: number;
  direction: "above" | "below" | "crosses_above" | "crosses_below";
  maxHoldPeriods: number;
  stopLossPct: number;
  takeProfitPct: number;
};

export type BacktestResult = {
  id: string;
  userId: string;
  config: BacktestConfig;
  totalReturnPct: number;
  winRate: number;
  maxDrawdownPct: number;
  sharpeLike: number;
  averageHoldPeriods: number;
  equityCurve: Array<{ time: string; value: number }>;
  trades: Array<{
    entryTime: string;
    exitTime: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
  }>;
  assumptions?: string[];
  sampleSize?: number;
  dataStart?: string;
  dataEnd?: string;
  createdAt: string;
};

export type ModelRun = {
  id: string;
  userId: string;
  eventId?: string;
  prompt: string;
  answer: string;
  confidence: number;
  createdAt: string;
};

export type ModelFeedback = {
  id: string;
  userId: string;
  modelRunId: string;
  helpful: boolean;
  note?: string;
  createdAt: string;
};

export type RewardEvent = {
  id: string;
  userId: string;
  eventType: string;
  points: number;
  createdAt: string;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  paperReturnPct: number;
  riskAdjustedScore: number;
  consistencyScore: number;
  drawdownScore: number;
  tradeCount: number;
  feedbackScore: number;
  totalScore: number;
};

export type Alert = {
  id: string;
  userId: string;
  eventId: string;
  condition: "above" | "below";
  probability: number;
  active: boolean;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};
