import { runProbabilityBacktest } from "@/lib/backtest";
import { answerPrompt, scoreEvent } from "@/lib/scout";
import { seedBars, seedEvents, seedSnapshots, seedSources } from "@/lib/seed";
import type {
  Alert,
  BacktestConfig,
  BacktestResult,
  EventCategory,
  ModelFeedback,
  ModelRun,
  Notification,
  PaperAccount,
  PaperPosition,
  PaperTrade,
  PredictionEvent,
  RewardEvent,
  Strategy,
  TradeSide,
} from "@/lib/types";
import {
  DEMO_USER_ID,
  newId,
  noPriceFromProbability,
  nowIso,
  yesPriceFromProbability,
} from "@/lib/utils";

const events = seedEvents();
const accounts = new Map<string, PaperAccount>();
const positions = new Map<string, PaperPosition[]>();
const trades = new Map<string, PaperTrade[]>();
const strategies = new Map<string, Strategy[]>();
const backtests = new Map<string, BacktestResult[]>();
const modelRuns = new Map<string, ModelRun[]>();
const feedback = new Map<string, ModelFeedback[]>();
const rewards = new Map<string, RewardEvent[]>();
const alerts = new Map<string, Alert[]>();
const notifications = new Map<string, Notification[]>();
const waitlist: Array<{ email: string; role?: string; createdAt: string }> = [];

export const store = {
  listEvents(filters?: { category?: EventCategory | "all"; q?: string }) {
    const q = filters?.q?.toLowerCase().trim();
    return events
      .filter((event) => !filters?.category || filters.category === "all" || event.category === filters.category)
      .filter((event) => !q || event.title.toLowerCase().includes(q) || event.category.includes(q))
      .map((event) => withLatest(event));
  },

  getEvent(idOrSlug: string) {
    const event = events.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
    return event ? withLatest(event) : null;
  },

  history(eventId: string) {
    return seedSnapshots().filter((snapshot) => snapshot.eventId === eventId);
  },

  bars(eventId: string) {
    return seedBars().filter((bar) => bar.eventId === eventId);
  },

  sources(eventId: string) {
    return seedSources().filter((source) => source.eventId === eventId);
  },

  ensureUser(userId = DEMO_USER_ID) {
    if (!accounts.has(userId)) {
      accounts.set(userId, {
        userId,
        cash: 10000,
        startingCash: 10000,
        createdAt: nowIso(),
      });
      positions.set(userId, []);
      trades.set(userId, []);
      strategies.set(userId, []);
      backtests.set(userId, []);
      modelRuns.set(userId, []);
      feedback.set(userId, []);
      rewards.set(userId, []);
      alerts.set(userId, []);
      notifications.set(userId, []);
      addReward(userId, "onboarding_complete", 50);
    }
    return accounts.get(userId)!;
  },

  onboard(userId: string) {
    const account = this.ensureUser(userId);
    notify(userId, "Paper account ready", "You now have $10,000 in paper capital.");
    return { account, onboardingComplete: true };
  },

  placeOrder(input: {
    userId: string;
    eventId: string;
    action: "buy" | "sell";
    side: TradeSide;
    quantity: number;
  }) {
    const account = this.ensureUser(input.userId);
    const event = this.getEvent(input.eventId);
    if (!event) throw new Error("Event not found.");
    if (event.status !== "open") throw new Error("Event is not open for paper trading.");
    if (new Date(event.closesAt).getTime() <= Date.now()) throw new Error("Event expired mid-order.");
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error("Quantity must be greater than zero.");

    const price = input.side === "yes"
      ? yesPriceFromProbability(event.latest.probability)
      : noPriceFromProbability(event.latest.probability);
    const notional = input.quantity * price;
    const userPositions = positions.get(input.userId) ?? [];
    const existing = userPositions.find((item) => item.eventId === event.id && item.side === input.side);

    if (input.action === "buy") {
      if (account.cash < notional) throw new Error("Insufficient paper cash.");
      account.cash = Number((account.cash - notional).toFixed(2));
      if (existing) {
        const nextQuantity = existing.quantity + input.quantity;
        existing.avgPrice = Number(((existing.avgPrice * existing.quantity + notional) / nextQuantity).toFixed(4));
        existing.quantity = nextQuantity;
        existing.updatedAt = nowIso();
      } else {
        userPositions.push({
          id: newId("pos"),
          userId: input.userId,
          eventId: event.id,
          side: input.side,
          quantity: input.quantity,
          avgPrice: Number(price.toFixed(4)),
          updatedAt: nowIso(),
        });
        positions.set(input.userId, userPositions);
      }
    } else {
      if (!existing || existing.quantity < input.quantity) throw new Error("Not enough open position to sell.");
      existing.quantity = Number((existing.quantity - input.quantity).toFixed(4));
      account.cash = Number((account.cash + notional).toFixed(2));
      positions.set(input.userId, userPositions.filter((item) => item.quantity > 0));
    }

    const trade: PaperTrade = {
      id: newId("trd"),
      userId: input.userId,
      eventId: event.id,
      action: input.action,
      side: input.side,
      quantity: input.quantity,
      price: Number(price.toFixed(4)),
      notional: Number(notional.toFixed(2)),
      createdAt: nowIso(),
      note: `${input.action.toUpperCase()} ${input.quantity} ${input.side.toUpperCase()} on ${event.title}`,
    };
    trades.set(input.userId, [trade, ...(trades.get(input.userId) ?? [])]);
    addReward(input.userId, "paper_trade", 5);
    notify(input.userId, "Paper order filled", trade.note);
    return { trade, portfolio: this.portfolio(input.userId) };
  },

  portfolio(userId: string) {
    const account = this.ensureUser(userId);
    const userPositions = positions.get(userId) ?? [];
    const enriched = userPositions.map((position) => {
      const event = this.getEvent(position.eventId)!;
      const mark = position.side === "yes"
        ? yesPriceFromProbability(event.latest.probability)
        : noPriceFromProbability(event.latest.probability);
      const value = position.quantity * mark;
      const cost = position.quantity * position.avgPrice;
      return {
        ...position,
        event,
        mark: Number(mark.toFixed(4)),
        value: Number(value.toFixed(2)),
        unrealizedPnl: Number((value - cost).toFixed(2)),
      };
    });
    const positionsValue = enriched.reduce((sum, position) => sum + position.value, 0);
    const totalValue = account.cash + positionsValue;
    return {
      account,
      positions: enriched,
      totalValue: Number(totalValue.toFixed(2)),
      paperReturnPct: Number((((totalValue - account.startingCash) / account.startingCash) * 100).toFixed(2)),
      rewards: rewards.get(userId) ?? [],
      notifications: notifications.get(userId) ?? [],
    };
  },

  trades(userId: string) {
    this.ensureUser(userId);
    return (trades.get(userId) ?? []).map((trade) => ({
      ...trade,
      event: this.getEvent(trade.eventId),
    }));
  },

  runBacktest(userId: string, config: BacktestConfig) {
    this.ensureUser(userId);
    const result = runProbabilityBacktest(userId, this.bars(config.eventId), config);
    backtests.set(userId, [result, ...(backtests.get(userId) ?? [])]);
    addReward(userId, "backtest_run", 10);
    notify(userId, "Backtest complete", `Return: ${result.totalReturnPct}% with ${result.trades.length} trades.`);
    return result;
  },

  getBacktest(userId: string, id: string) {
    this.ensureUser(userId);
    return (backtests.get(userId) ?? []).find((item) => item.id === id) ?? null;
  },

  saveStrategy(userId: string, payload: Omit<Strategy, "id" | "userId" | "createdAt">) {
    this.ensureUser(userId);
    const strategy: Strategy = {
      id: newId("str"),
      userId,
      createdAt: nowIso(),
      ...payload,
    };
    strategies.set(userId, [strategy, ...(strategies.get(userId) ?? [])]);
    addReward(userId, "strategy_saved", 25);
    return strategy;
  },

  listStrategies(userId: string) {
    this.ensureUser(userId);
    return strategies.get(userId) ?? [];
  },

  analyze(userId: string, prompt: string, eventId?: string) {
    this.ensureUser(userId);
    const event = eventId ? this.getEvent(eventId) : this.listEvents()[0];
    const latest = event ? event.latest : undefined;
    const response = answerPrompt(prompt, event ?? undefined, latest);
    const run: ModelRun = {
      id: newId("run"),
      userId,
      eventId: event?.id,
      prompt,
      answer: response.answer,
      confidence: response.confidence,
      createdAt: nowIso(),
    };
    modelRuns.set(userId, [run, ...(modelRuns.get(userId) ?? [])]);
    return run;
  },

  feedback(userId: string, modelRunId: string, helpful: boolean, note?: string) {
    this.ensureUser(userId);
    const item: ModelFeedback = {
      id: newId("fdb"),
      userId,
      modelRunId,
      helpful,
      note,
      createdAt: nowIso(),
    };
    feedback.set(userId, [item, ...(feedback.get(userId) ?? [])]);
    addReward(userId, helpful && note ? "model_feedback_written" : "model_feedback", helpful && note ? 25 : 15);
    return item;
  },

  leaderboard() {
    const userIds = [...accounts.keys()];
    if (!userIds.includes(DEMO_USER_ID)) this.ensureUser(DEMO_USER_ID);
    return [...new Set([...userIds, DEMO_USER_ID, "maya", "jordan", "avi"])]
      .map((userId) => leaderboardRow(userId))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  },

  createAlert(userId: string, eventId: string, condition: "above" | "below", probability: number) {
    this.ensureUser(userId);
    if (!this.getEvent(eventId)) throw new Error("Event not found.");
    const alert: Alert = {
      id: newId("alt"),
      userId,
      eventId,
      condition,
      probability,
      active: true,
      createdAt: nowIso(),
    };
    alerts.set(userId, [alert, ...(alerts.get(userId) ?? [])]);
    return alert;
  },

  listAlerts(userId: string) {
    this.ensureUser(userId);
    return (alerts.get(userId) ?? []).map((alert) => ({ ...alert, event: this.getEvent(alert.eventId) }));
  },

  deleteAlert(userId: string, id: string) {
    this.ensureUser(userId);
    alerts.set(userId, (alerts.get(userId) ?? []).filter((alert) => alert.id !== id));
    return { ok: true };
  },

  joinWaitlist(email: string, role?: string) {
    if (!email.includes("@")) throw new Error("Enter a valid email.");
    waitlist.push({ email, role, createdAt: nowIso() });
    return { ok: true, count: waitlist.length };
  },

  ingest(provider: string) {
    return {
      provider,
      status: "cached",
      message: "Demo ingestion ran. Add provider API keys and Supabase service role to enable live snapshots.",
      at: nowIso(),
    };
  },

  resolve(category: EventCategory) {
    return {
      category,
      status: "queued",
      message: "Demo resolver queued. Production resolver must compare official source data and mark conflicts as needs_review.",
      at: nowIso(),
    };
  },
};

function withLatest(event: PredictionEvent) {
  const currentSnapshots = seedSnapshots();
  const currentSources = seedSources();
  const latest = currentSnapshots
    .filter((snapshot) => snapshot.eventId === event.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const scored = scoreEvent(event, latest);
  return {
    ...event,
    latest: {
      ...latest,
      probability: scored.probability,
      confidence: scored.confidence,
    },
    sources: currentSources.filter((source) => source.eventId === event.id),
  };
}

function addReward(userId: string, eventType: string, points: number) {
  const reward: RewardEvent = {
    id: newId("rew"),
    userId,
    eventType,
    points,
    createdAt: nowIso(),
  };
  rewards.set(userId, [reward, ...(rewards.get(userId) ?? [])]);
}

function notify(userId: string, title: string, body: string) {
  const notification: Notification = {
    id: newId("ntf"),
    userId,
    title,
    body,
    createdAt: nowIso(),
    read: false,
  };
  notifications.set(userId, [notification, ...(notifications.get(userId) ?? [])]);
}

function leaderboardRow(userId: string) {
  const portfolio = store.portfolio(userId);
  const tradeCount = store.trades(userId).length || (userId === DEMO_USER_ID ? 5 : 7);
  const feedbackScore = (feedback.get(userId)?.length ?? (userId === DEMO_USER_ID ? 2 : 3)) * 8;
  const paperReturnPct = userId === "maya" ? 18.4 : userId === "jordan" ? 12.1 : portfolio.paperReturnPct;
  const riskAdjustedScore = Math.max(0, Math.min(100, 50 + paperReturnPct * 2));
  const consistencyScore = Math.min(100, tradeCount * 8);
  const drawdownScore = Math.max(0, 90 - Math.max(0, -paperReturnPct) * 3);
  const totalScore =
    riskAdjustedScore * 0.4 +
    consistencyScore * 0.25 +
    drawdownScore * 0.15 +
    Math.min(100, tradeCount * 10) * 0.1 +
    Math.min(100, feedbackScore) * 0.1;

  return {
    rank: 0,
    userId,
    displayName: userId === DEMO_USER_ID ? "Andromeda Demo" : userId[0]!.toUpperCase() + userId.slice(1),
    paperReturnPct,
    riskAdjustedScore: Number(riskAdjustedScore.toFixed(2)),
    consistencyScore: Number(consistencyScore.toFixed(2)),
    drawdownScore: Number(drawdownScore.toFixed(2)),
    tradeCount,
    feedbackScore,
    totalScore: Number(totalScore.toFixed(2)),
  };
}
