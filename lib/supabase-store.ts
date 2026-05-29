import { runProbabilityBacktest } from "@/lib/backtest";
import { store } from "@/lib/demo-store";
import type { LiveEvent } from "@/lib/live-event-feed";
import { answerPromptAsync, scoreEvent } from "@/lib/scout";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import type {
  Alert,
  BacktestConfig,
  BacktestResult,
  EventCategory,
  EventSource,
  MarketPriceBar,
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
import { noPriceFromProbability, nowIso, yesPriceFromProbability } from "@/lib/utils";

type EventWithLatest = PredictionEvent & {
  latest: ReturnType<typeof mapSnapshot>;
  sources: EventSource[];
};

export function canUseSupabaseStore() {
  return hasSupabaseEnv() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const supabaseStore = {
  async listEvents(filters?: { category?: EventCategory | "all"; q?: string }) {
    const supabase = createServiceSupabaseClient();
    let query = supabase.from("events").select("*").order("closes_at", { ascending: true });

    if (filters?.category && filters.category !== "all") query = query.eq("category", filters.category);
    if (filters?.q) query = query.ilike("title", `%${filters.q}%`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return hydrateEvents(data ?? []);
  },

  async getEvent(idOrSlug: string) {
    const supabase = createServiceSupabaseClient();
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const query = supabase
      .from("events")
      .select("*");
    const { data, error } = looksLikeUuid
      ? await query.eq("id", idOrSlug).maybeSingle()
      : await query.eq("slug", idOrSlug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return ensureBundledEventInDatabase(idOrSlug);
    return (await hydrateEvents([data]))[0] ?? null;
  },

  async upsertLiveEvent(event: LiveEvent) {
    const supabase = createServiceSupabaseClient();
    await checked(supabase.from("events").upsert({
      id: event.id,
      slug: event.slug,
      title: event.title,
      category: event.category,
      status: event.status,
      description: event.description,
      resolution_source: event.resolutionSource,
      resolution_rule: event.resolutionRule,
      closes_at: event.closesAt,
      resolves_at: event.resolvesAt,
      outcome: event.outcome ?? null,
      created_at: event.createdAt,
    }, { onConflict: "id" }));

    await Promise.all([
      checked(supabase.from("event_sources").delete().eq("event_id", event.id)),
      checked(supabase.from("probability_snapshots").delete().eq("event_id", event.id)),
      checked(supabase.from("market_price_bars").delete().eq("event_id", event.id)),
      checked(supabase.from("event_resolution_rules").delete().eq("event_id", event.id)),
    ]);

    if (event.sources.length) {
      await checked(supabase.from("event_sources").insert(event.sources.map((source) => ({
        event_id: source.eventId,
        provider: source.provider,
        provider_url: source.providerUrl,
        label: source.label,
        last_updated_at: source.lastUpdatedAt,
        status: source.status,
      }))));
    }

    if (event.history.length) {
      await checked(supabase.from("probability_snapshots").insert(event.history.map((snapshot) => ({
        event_id: snapshot.eventId,
        probability: snapshot.probability,
        confidence: snapshot.confidence,
        source_count: snapshot.sourceCount,
        data_freshness_minutes: snapshot.dataFreshnessMinutes,
        explanation: snapshot.explanation,
        risk_notes: snapshot.riskNotes,
        created_at: snapshot.createdAt,
      }))));
    }

    if (event.bars.length) {
      await checked(supabase.from("market_price_bars").insert(event.bars.map((bar) => ({
        event_id: bar.eventId,
        time: bar.time,
        probability: bar.probability,
        volume: bar.volume,
      }))));
    }

    await checked(supabase.from("event_resolution_rules").upsert({
      event_id: event.id,
      category: event.category,
      provider: event.resolutionSource,
      rule: {
        rule: event.resolutionRule,
        source_url: event.latest.calculation?.sourceUrl,
        calculation: event.latest.calculation,
        conflict_policy: "needs_review",
      },
    }, { onConflict: "event_id" }));

    return event;
  },

  async history(eventId: string) {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("probability_snapshots")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSnapshot);
  },

  async bars(eventId: string) {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("market_price_bars")
      .select("*")
      .eq("event_id", eventId)
      .order("time", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBar);
  },

  async sources(eventId: string) {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("event_sources")
      .select("*")
      .eq("event_id", eventId)
      .order("last_updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSource);
  },

  async ensureUser(userId: string) {
    const supabase = createServiceSupabaseClient();
    await checked(supabase.from("profiles").upsert({ user_id: userId }, { onConflict: "user_id" }));
    await checked(supabase.from("paper_accounts").upsert({ user_id: userId }, { onConflict: "user_id" }));

    const { data, error } = await supabase
      .from("paper_accounts")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);
    return mapAccount(data);
  },

  async onboard(userId: string) {
    const account = await this.ensureUser(userId);
    const supabase = createServiceSupabaseClient();
    await checked(supabase.from("profiles").update({ onboarding_complete: true }).eq("user_id", userId));
    await checked(supabase.from("onboarding_state").upsert({
      user_id: userId,
      complete: true,
      completed_at: nowIso(),
    }, { onConflict: "user_id" }));
    await addReward(userId, "onboarding_complete", 50);
    await notify(userId, "Paper account ready", "You now have $10,000 in paper capital.");
    return { account, onboardingComplete: true };
  },

  async placeOrder(input: {
    userId: string;
    eventId: string;
    action: "buy" | "sell";
    side: TradeSide;
    quantity: number;
  }) {
    const supabase = createServiceSupabaseClient();
    const account = await this.ensureUser(input.userId);
    const event = await this.getEvent(input.eventId);
    if (!event) throw new Error("Event not found.");
    if (event.status !== "open") throw new Error("Event is not open for paper trading.");
    if (new Date(event.closesAt).getTime() <= Date.now()) throw new Error("Event expired mid-order.");
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error("Quantity must be greater than zero.");

    const price = input.side === "yes"
      ? yesPriceFromProbability(event.latest.probability)
      : noPriceFromProbability(event.latest.probability);
    const notional = Number((input.quantity * price).toFixed(2));

    const { data: existingPosition, error: positionError } = await supabase
      .from("paper_positions")
      .select("*")
      .eq("user_id", input.userId)
      .eq("event_id", event.id)
      .eq("side", input.side)
      .maybeSingle();
    if (positionError) throw new Error(positionError.message);

    if (input.action === "buy") {
      if (account.cash < notional) throw new Error("Insufficient paper cash.");
      await checked(supabase.from("paper_accounts").update({
        cash: Number((account.cash - notional).toFixed(2)),
      }).eq("user_id", input.userId));

      if (existingPosition) {
        const currentQuantity = Number(existingPosition.quantity);
        const nextQuantity = currentQuantity + input.quantity;
        const nextAvg = ((Number(existingPosition.avg_price) * currentQuantity) + notional) / nextQuantity;
        await checked(supabase.from("paper_positions").update({
          quantity: nextQuantity,
          avg_price: Number(nextAvg.toFixed(4)),
          updated_at: nowIso(),
        }).eq("id", existingPosition.id));
      } else {
        await checked(supabase.from("paper_positions").insert({
          user_id: input.userId,
          event_id: event.id,
          side: input.side,
          quantity: input.quantity,
          avg_price: Number(price.toFixed(4)),
        }));
      }
    } else {
      if (!existingPosition || Number(existingPosition.quantity) < input.quantity) {
        throw new Error("Not enough open position to sell.");
      }

      await checked(supabase.from("paper_accounts").update({
        cash: Number((account.cash + notional).toFixed(2)),
      }).eq("user_id", input.userId));

      const remaining = Number((Number(existingPosition.quantity) - input.quantity).toFixed(4));
      if (remaining <= 0) {
        await checked(supabase.from("paper_positions").delete().eq("id", existingPosition.id));
      } else {
        await checked(supabase.from("paper_positions").update({
          quantity: remaining,
          updated_at: nowIso(),
        }).eq("id", existingPosition.id));
      }
    }

    const { data: order, error: orderError } = await supabase.from("paper_orders").insert({
      user_id: input.userId,
      event_id: event.id,
      action: input.action,
      side: input.side,
      quantity: input.quantity,
      status: "filled",
    }).select("*").single();
    if (orderError) throw new Error(orderError.message);

    const note = `${input.action.toUpperCase()} ${input.quantity} ${input.side.toUpperCase()} on ${event.title}`;
    const { data: trade, error: tradeError } = await supabase.from("paper_trades").insert({
      user_id: input.userId,
      order_id: order.id,
      event_id: event.id,
      action: input.action,
      side: input.side,
      quantity: input.quantity,
      price: Number(price.toFixed(4)),
      notional,
      note,
    }).select("*").single();
    if (tradeError) throw new Error(tradeError.message);

    await addReward(input.userId, "paper_trade", 5);
    await notify(input.userId, "Paper order filled", note);

    return {
      trade: { ...mapTrade(trade), event },
      portfolio: await this.portfolio(input.userId),
    };
  },

  async portfolio(userId: string) {
    const account = await this.ensureUser(userId);
    const supabase = createServiceSupabaseClient();
    const { data: positions, error } = await supabase
      .from("paper_positions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    const enriched = await Promise.all((positions ?? []).map(async (row) => {
      const position = mapPosition(row);
      const event = await this.getEvent(position.eventId);
      if (!event) throw new Error("Position references a missing event.");
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
    }));

    const positionsValue = enriched.reduce((sum, position) => sum + position.value, 0);
    const totalValue = account.cash + positionsValue;
    return {
      account,
      positions: enriched,
      totalValue: Number(totalValue.toFixed(2)),
      paperReturnPct: Number((((totalValue - account.startingCash) / account.startingCash) * 100).toFixed(2)),
      rewards: await rewardsFor(userId),
      notifications: await notificationsFor(userId),
    };
  },

  async trades(userId: string) {
    await this.ensureUser(userId);
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("paper_trades")
      .select("*, events(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map(async (row) => ({
      ...mapTrade(row),
      event: row.events ? await hydrateEvent(row.events) : null,
    })));
  },

  async runBacktest(userId: string, config: BacktestConfig) {
    await this.ensureUser(userId);
    const result = runProbabilityBacktest(userId, await this.bars(config.eventId), config);
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("backtests").insert({
      user_id: userId,
      config,
      result,
    }).select("*").single();
    if (error) throw new Error(error.message);
    await addReward(userId, "backtest_run", 10);
    await notify(userId, "Backtest complete", `Return: ${result.totalReturnPct}% with ${result.trades.length} trades.`);
    return { ...result, id: data.id, createdAt: data.created_at };
  },

  async getBacktest(userId: string, id: string) {
    await this.ensureUser(userId);
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("backtests")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { ...(data.result as BacktestResult), id: data.id, createdAt: data.created_at } : null;
  },

  async saveStrategy(userId: string, payload: Omit<Strategy, "id" | "userId" | "createdAt">) {
    await this.ensureUser(userId);
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("strategies").insert({
      user_id: userId,
      name: payload.name,
      description: payload.description,
      event_category: payload.eventCategory,
      rule: payload.rule,
    }).select("*").single();
    if (error) throw new Error(error.message);
    await addReward(userId, "strategy_saved", 25);
    return mapStrategy(data);
  },

  async listStrategies(userId: string) {
    await this.ensureUser(userId);
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("strategies")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapStrategy);
  },

  async analyze(userId: string, prompt: string, eventId?: string) {
    await this.ensureUser(userId);
    const event = eventId ? await this.getEvent(eventId) : (await this.listEvents())[0];
    const response = await answerPromptAsync(prompt, event ?? undefined, event?.latest);
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("model_runs").insert({
      user_id: userId,
      event_id: event?.id,
      prompt,
      answer: response.answer,
      confidence: response.confidence,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return mapModelRun(data);
  },

  async feedback(userId: string, modelRunId: string, helpful: boolean, note?: string) {
    await this.ensureUser(userId);
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("model_feedback").insert({
      user_id: userId,
      model_run_id: modelRunId,
      helpful,
      note,
    }).select("*").single();
    if (error) throw new Error(error.message);
    await addReward(userId, helpful && note ? "model_feedback_written" : "model_feedback", helpful && note ? 25 : 15);
    return mapFeedback(data);
  },

  async leaderboard() {
    const supabase = createServiceSupabaseClient();
    const { data: accounts, error } = await supabase.from("paper_accounts").select("*");
    if (error) throw new Error(error.message);
    const rows = await Promise.all((accounts ?? []).map(async (accountRow) => {
      const userId = accountRow.user_id as string;
      const portfolio = await this.portfolio(userId);
      const trades = await this.trades(userId);
      const rewards = await rewardsFor(userId);
      const displayName = await displayNameFor(userId);
      const paperReturnPct = portfolio.paperReturnPct;
      const riskAdjustedScore = Math.max(0, Math.min(100, 50 + paperReturnPct * 2));
      const consistencyScore = Math.min(100, trades.length * 8);
      const drawdownScore = Math.max(0, 90 - Math.max(0, -paperReturnPct) * 3);
      const feedbackScore = rewards
        .filter((reward) => reward.eventType.includes("model_feedback"))
        .reduce((sum, reward) => sum + reward.points, 0);
      const totalScore =
        riskAdjustedScore * 0.4 +
        consistencyScore * 0.25 +
        drawdownScore * 0.15 +
        Math.min(100, trades.length * 10) * 0.1 +
        Math.min(100, feedbackScore) * 0.1;

      return {
        rank: 0,
        userId,
        displayName,
        paperReturnPct,
        riskAdjustedScore: Number(riskAdjustedScore.toFixed(2)),
        consistencyScore: Number(consistencyScore.toFixed(2)),
        drawdownScore: Number(drawdownScore.toFixed(2)),
        tradeCount: trades.length,
        feedbackScore,
        totalScore: Number(totalScore.toFixed(2)),
      };
    }));
    return rows.sort((a, b) => b.totalScore - a.totalScore).map((row, index) => ({ ...row, rank: index + 1 }));
  },

  async createAlert(userId: string, eventId: string, condition: "above" | "below", probability: number) {
    await this.ensureUser(userId);
    if (!(await this.getEvent(eventId))) throw new Error("Event not found.");
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("alerts").insert({
      user_id: userId,
      event_id: eventId,
      condition,
      probability,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return mapAlert(data);
  },

  async listAlerts(userId: string) {
    await this.ensureUser(userId);
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map(async (row) => ({
      ...mapAlert(row),
      event: await this.getEvent(row.event_id),
    })));
  },

  async deleteAlert(userId: string, id: string) {
    await this.ensureUser(userId);
    const supabase = createServiceSupabaseClient();
    await checked(supabase.from("alerts").delete().eq("user_id", userId).eq("id", id));
    return { ok: true };
  },

  async joinWaitlist(email: string, role?: string) {
    if (!email.includes("@")) throw new Error("Enter a valid email.");
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from("waitlist").upsert({
      email,
      role,
    }, { onConflict: "email" }).select("*");
    if (error) throw new Error(error.message);
    return { ok: true, count: data?.length ?? 1 };
  },

  ingest(provider: string) {
    return {
      provider,
      status: "cached",
      message: "Ingestion endpoint is connected. Add provider-specific API keys before enabling scheduled live ingestion.",
      at: nowIso(),
    };
  },

  resolve(category: EventCategory) {
    return {
      category,
      status: "queued",
      message: "Resolver endpoint is connected. Production resolution should compare official data and mark conflicts as needs_review.",
      at: nowIso(),
    };
  },
};

async function hydrateEvents(rows: any[]): Promise<EventWithLatest[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [snapshots, sources] = await Promise.all([
    latestSnapshots(ids),
    sourceMap(ids),
  ]);
  return rows.map((row) => {
    const event = mapEvent(row);
    const latest = snapshots.get(event.id) ?? fallbackSnapshot(event.id);
    const scored = scoreEvent(event, latest);
    return {
      ...event,
      latest: {
        ...latest,
        probability: scored.probability,
        confidence: scored.confidence,
      },
      sources: sources.get(event.id) ?? [],
    };
  });
}

async function hydrateEvent(row: any) {
  return (await hydrateEvents([row]))[0] ?? null;
}

async function ensureBundledEventInDatabase(idOrSlug: string) {
  const bundled = store.getEvent(idOrSlug);
  if (!bundled) return null;

  const supabase = createServiceSupabaseClient();
  await checked(supabase.from("events").upsert({
    id: bundled.id,
    slug: bundled.slug,
    title: bundled.title,
    category: bundled.category,
    status: bundled.status,
    description: bundled.description,
    resolution_source: bundled.resolutionSource,
    resolution_rule: bundled.resolutionRule,
    closes_at: bundled.closesAt,
    resolves_at: bundled.resolvesAt,
    outcome: bundled.outcome ?? null,
    created_at: bundled.createdAt,
  }, { onConflict: "id" }));

  await Promise.all([
    checked(supabase.from("event_sources").delete().eq("event_id", bundled.id)),
    checked(supabase.from("probability_snapshots").delete().eq("event_id", bundled.id)),
    checked(supabase.from("market_price_bars").delete().eq("event_id", bundled.id)),
    checked(supabase.from("event_resolution_rules").delete().eq("event_id", bundled.id)),
  ]);

  const sources = store.sources(bundled.id).map((source) => ({
    event_id: source.eventId,
    provider: source.provider,
    provider_url: source.providerUrl,
    label: source.label,
    last_updated_at: source.lastUpdatedAt,
    status: source.status,
  }));
  const snapshots = store.history(bundled.id).map((snapshot) => ({
    event_id: snapshot.eventId,
    probability: snapshot.probability,
    confidence: snapshot.confidence,
    source_count: snapshot.sourceCount,
    data_freshness_minutes: snapshot.dataFreshnessMinutes,
    explanation: snapshot.explanation,
    risk_notes: snapshot.riskNotes,
    created_at: snapshot.createdAt,
  }));
  const bars = store.bars(bundled.id).map((bar) => ({
    event_id: bar.eventId,
    time: bar.time,
    probability: bar.probability,
    volume: bar.volume,
  }));

  if (sources.length) await checked(supabase.from("event_sources").insert(sources));
  if (snapshots.length) await checked(supabase.from("probability_snapshots").insert(snapshots));
  if (bars.length) await checked(supabase.from("market_price_bars").insert(bars));
  await checked(supabase.from("event_resolution_rules").upsert({
    event_id: bundled.id,
    category: bundled.category,
    provider: bundled.resolutionSource,
    rule: { rule: bundled.resolutionRule, conflict_policy: "needs_review" },
  }, { onConflict: "event_id" }));

  const { data, error } = await supabase.from("events").select("*").eq("id", bundled.id).single();
  if (error) throw new Error(error.message);
  return hydrateEvent(data);
}

async function latestSnapshots(eventIds: string[]) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("probability_snapshots")
    .select("*")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const map = new Map<string, ReturnType<typeof mapSnapshot>>();
  for (const row of data ?? []) {
    if (!map.has(row.event_id)) map.set(row.event_id, mapSnapshot(row));
  }
  return map;
}

async function sourceMap(eventIds: string[]) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("event_sources")
    .select("*")
    .in("event_id", eventIds)
    .order("last_updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  const map = new Map<string, EventSource[]>();
  for (const row of data ?? []) {
    const source = mapSource(row);
    map.set(source.eventId, [...(map.get(source.eventId) ?? []), source]);
  }
  return map;
}

async function addReward(userId: string, eventType: string, points: number) {
  const supabase = createServiceSupabaseClient();
  await checked(supabase.from("reward_events").insert({
    user_id: userId,
    event_type: eventType,
    points,
  }));
}

async function notify(userId: string, title: string, body: string) {
  const supabase = createServiceSupabaseClient();
  await checked(supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
  }));
}

async function rewardsFor(userId: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("reward_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapReward);
}

async function notificationsFor(userId: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotification);
}

async function displayNameFor(userId: string) {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.display_name ?? "Andromeda User";
}

async function checked(query: PromiseLike<{ error: any }>) {
  const { error } = await query;
  if (error) throw new Error(error.message);
}

function mapEvent(row: any): PredictionEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    status: row.status,
    description: row.description,
    resolutionSource: row.resolution_source,
    resolutionRule: row.resolution_rule,
    closesAt: row.closes_at,
    resolvesAt: row.resolves_at,
    outcome: row.outcome ?? undefined,
    createdAt: row.created_at,
  };
}

function mapSource(row: any): EventSource {
  return {
    id: row.id,
    eventId: row.event_id,
    provider: row.provider,
    providerUrl: row.provider_url,
    label: row.label,
    lastUpdatedAt: row.last_updated_at,
    status: row.status,
  };
}

function mapSnapshot(row: any) {
  return {
    id: row.id,
    eventId: row.event_id,
    probability: Number(row.probability),
    confidence: Number(row.confidence),
    sourceCount: Number(row.source_count),
    dataFreshnessMinutes: Number(row.data_freshness_minutes),
    explanation: row.explanation,
    riskNotes: row.risk_notes,
    createdAt: row.created_at,
  };
}

function fallbackSnapshot(eventId: string) {
  return {
    id: `fallback_${eventId}`,
    eventId,
    probability: 50,
    confidence: 30,
    sourceCount: 0,
    dataFreshnessMinutes: 9999,
    explanation: "No stored source data is available yet.",
    riskNotes: "This event needs ingestion before users should rely on the probability.",
    createdAt: nowIso(),
  };
}

function mapBar(row: any): MarketPriceBar {
  return {
    id: row.id,
    eventId: row.event_id,
    time: row.time,
    probability: Number(row.probability),
    volume: Number(row.volume),
  };
}

function mapAccount(row: any): PaperAccount {
  return {
    userId: row.user_id,
    cash: Number(row.cash),
    startingCash: Number(row.starting_cash),
    createdAt: row.created_at,
  };
}

function mapPosition(row: any): PaperPosition {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    side: row.side,
    quantity: Number(row.quantity),
    avgPrice: Number(row.avg_price),
    updatedAt: row.updated_at,
  };
}

function mapTrade(row: any): PaperTrade {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    action: row.action,
    side: row.side,
    quantity: Number(row.quantity),
    price: Number(row.price),
    notional: Number(row.notional),
    realizedPnl: row.realized_pnl === null ? undefined : Number(row.realized_pnl),
    note: row.note,
    createdAt: row.created_at,
  };
}

function mapStrategy(row: any): Strategy {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    eventCategory: row.event_category,
    rule: row.rule,
    createdAt: row.created_at,
  };
}

function mapModelRun(row: any): ModelRun {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id ?? undefined,
    prompt: row.prompt,
    answer: row.answer,
    confidence: Number(row.confidence),
    createdAt: row.created_at,
  };
}

function mapFeedback(row: any): ModelFeedback {
  return {
    id: row.id,
    userId: row.user_id,
    modelRunId: row.model_run_id,
    helpful: row.helpful,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

function mapReward(row: any): RewardEvent {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    points: Number(row.points),
    createdAt: row.created_at,
  };
}

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at,
  };
}

function mapAlert(row: any): Alert {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    condition: row.condition,
    probability: Number(row.probability),
    active: row.active,
    createdAt: row.created_at,
  };
}
