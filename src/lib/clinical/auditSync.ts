/**
 * Copies device audit events to the hospital's server log when the user is
 * signed in and approved. Events wait in an outbox while offline and are sent
 * in order; a duplicate (already stored) counts as sent.
 */
import type { AuditEvent } from "./audit";

const KEY = "nap-audit-outbox-v1";
const MAX = 2000;

export interface Outbox {
  read(): AuditEvent[];
  write(events: AuditEvent[]): void;
}

export const localOutbox: Outbox = {
  read() {
    try {
      const raw = window.localStorage.getItem(KEY);
      const v = raw ? JSON.parse(raw) : [];
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  },
  write(events) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX)));
    } catch {
      /* storage full or blocked: events stay in the device log */
    }
  },
};

export function enqueue(box: Outbox, e: AuditEvent): void {
  const cur = box.read();
  if (!cur.some((x) => x.id === e.id)) box.write([...cur, e]);
}

export type SendResult = "sent" | "duplicate" | "retry" | "rejected";

/** Sends queued events oldest first. Stops at the first "retry" (offline or server busy) so order is kept. */
export async function flush(box: Outbox, send: (e: AuditEvent) => Promise<SendResult>): Promise<{ sent: number; rejected: number; left: number }> {
  const queue = box.read();
  let i = 0;
  let sent = 0;
  let rejected = 0;
  for (; i < queue.length; i++) {
    const r = await send(queue[i]);
    if (r === "retry") break;
    if (r === "rejected") rejected++;
    else sent++;
    box.write(queue.slice(i + 1));
  }
  return { sent, rejected, left: queue.length - i };
}

/** Server row for an event. The summary holds the calculation, never a patient name. */
export function toServerRow(e: AuditEvent, hospitalId: string) {
  return {
    hospital_id: hospitalId,
    type: e.type,
    summary: (e.by ? `[${e.by}] ` : "") + e.summary,
    occurred_at: e.at,
    client_id: /^[0-9a-f-]{36}$/i.test(e.id) ? e.id : null,
  };
}
