import { describe, expect, it } from "vitest";
import type { AuditEvent } from "./audit";
import { enqueue, flush, toServerRow, type Outbox, type SendResult } from "./auditSync";

function memBox(): Outbox & { items: AuditEvent[] } {
  const box = { items: [] as AuditEvent[], read: () => box.items, write: (e: AuditEvent[]) => (box.items = e) };
  return box;
}
const ev = (id: string): AuditEvent => ({ id, at: "2026-11-18T10:00:00.000Z", type: "score-recorded", summary: `GCS ${id}` });

describe("audit outbox", () => {
  it("does not queue the same event twice", () => {
    const b = memBox();
    enqueue(b, ev("a"));
    enqueue(b, ev("a"));
    expect(b.items).toHaveLength(1);
  });
  it("sends in order and keeps the rest when offline", async () => {
    const b = memBox();
    ["a", "b", "c"].forEach((x) => enqueue(b, ev(x)));
    const seen: string[] = [];
    const r = await flush(b, async (e) => {
      seen.push(e.id);
      return (e.id === "b" ? "retry" : "sent") as SendResult;
    });
    expect(seen).toEqual(["a", "b"]);
    expect(r).toEqual({ sent: 1, rejected: 0, left: 2 });
    expect(b.items.map((e) => e.id)).toEqual(["b", "c"]);
  });
  it("duplicates count as sent and rejected events are dropped", async () => {
    const b = memBox();
    ["a", "b"].forEach((x) => enqueue(b, ev(x)));
    const r = await flush(b, async (e) => (e.id === "a" ? "duplicate" : "rejected"));
    expect(r).toEqual({ sent: 1, rejected: 1, left: 0 });
    expect(b.items).toEqual([]);
  });
  it("server row keeps device time and only passes UUID ids", () => {
    const id = "6f1c2a8e-3d4b-4c5d-8e9f-0a1b2c3d4e5f";
    expect(toServerRow({ ...ev(id), by: "AL" }, "h1")).toEqual({ hospital_id: "h1", type: "score-recorded", summary: `[AL] GCS ${id}`, occurred_at: "2026-11-18T10:00:00.000Z", client_id: id });
    expect(toServerRow(ev("123-abc"), "h1").client_id).toBeNull();
  });
});
