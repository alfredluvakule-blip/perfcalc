/**
 * Audit log kept on this device until the platform has a server.
 * Append-only from the app's side; entries hold the calculation, not patient names.
 */

export type AuditType = "calculation-confirmed" | "double-check" | "label-printed" | "formulary-changed" | "fluid-entry";

export interface AuditEvent {
  id: string;
  at: string;
  type: AuditType;
  /** Initials or staff number typed by the user, if any. */
  by?: string;
  summary: string;
}

const KEY = "nap-audit-v1";
const MAX = 500;

export function readAudit(): AuditEvent[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logAudit(type: AuditType, summary: string, by?: string): AuditEvent {
  const event: AuditEvent = { id: newId(), at: new Date().toISOString(), type, summary, by: by?.trim() || undefined };
  try {
    const next = [event, ...readAudit()].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("nap-audit"));
  } catch {
    /* storage unavailable: the event is still returned */
  }
  return event;
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
