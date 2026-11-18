import { describe, expect, it } from "vitest";
import { latestApproved, nextVersion, pendingDrafts, sameContent, type VersionRow } from "./serverContent";

const row = (version: number | string, status: VersionRow["status"]): VersionRow => ({ id: String(version), version, status, created_at: "", approved_at: null, data: {} });

describe("server content versions", () => {
  it("next version follows the highest, numeric or text", () => {
    expect(nextVersion([])).toBe(1);
    expect(nextVersion([row(1, "approved"), row("3", "draft"), row(2, "retired")])).toBe(4);
  });
  it("latest approved is the highest approved", () => {
    expect(latestApproved([row(1, "approved"), row(3, "approved"), row(4, "draft")])?.version).toBe(3);
    expect(latestApproved([row(1, "draft")])).toBeNull();
  });
  it("pending drafts are only those newer than the approved version", () => {
    expect(pendingDrafts([row(1, "draft"), row(2, "approved"), row(3, "draft"), row(4, "draft")]).map((r) => r.version)).toEqual([4, 3]);
  });
  it("content comparison ignores the export time", () => {
    expect(sameContent({ a: 1, exportedOn: "x" }, { a: 1, exportedOn: "y" })).toBe(true);
    expect(sameContent({ a: 1 }, { a: 2 })).toBe(false);
  });
});
