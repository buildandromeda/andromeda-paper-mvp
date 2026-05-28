import { describe, expect, it } from "vitest";
import { store } from "@/lib/demo-store";

describe("paper order engine", () => {
  it("rejects overspending", () => {
    const event = store.listEvents()[0]!;
    expect(() => store.placeOrder({
      userId: "overspend-user",
      eventId: event.id,
      action: "buy",
      side: "yes",
      quantity: 1_000_000,
    })).toThrow("Insufficient paper cash");
  });

  it("fills a valid paper order and creates a position", () => {
    const event = store.listEvents()[0]!;
    const result = store.placeOrder({
      userId: "valid-user",
      eventId: event.id,
      action: "buy",
      side: "yes",
      quantity: 5,
    });
    expect(result.trade.id).toMatch(/^trd_/);
    expect(result.portfolio.positions.length).toBe(1);
  });
});
