/**
 * Versioned hospital content on the server (formulary, checklist library).
 * Each submission is a new draft version; an administrator approves it; the
 * newest approved version is what devices should use.
 */
export type ServerStatus = "draft" | "approved" | "retired";

export interface VersionRow {
  id: string;
  version: number | string;
  status: ServerStatus;
  created_at: string;
  approved_at: string | null;
  data: unknown;
}

const num = (v: number | string) => (typeof v === "number" ? v : Number.parseInt(v, 10) || 0);

export function nextVersion(rows: VersionRow[]): number {
  return rows.reduce((m, r) => Math.max(m, num(r.version)), 0) + 1;
}

export function latestApproved<T extends VersionRow>(rows: T[]): T | null {
  return rows.filter((r) => r.status === "approved").sort((a, b) => num(b.version) - num(a.version))[0] ?? null;
}

/** Drafts newer than the approved version, newest first. Older drafts were superseded. */
export function pendingDrafts<T extends VersionRow>(rows: T[]): T[] {
  const base = latestApproved(rows);
  const floor = base ? num(base.version) : 0;
  return rows.filter((r) => r.status === "draft" && num(r.version) > floor).sort((a, b) => num(b.version) - num(a.version));
}

/** Same content, ignoring when it was exported. */
export function sameContent(a: unknown, b: unknown): boolean {
  const strip = (x: unknown) => {
    if (!x || typeof x !== "object") return x;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { exportedOn, ...rest } = x as Record<string, unknown>;
    return rest;
  };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}
