import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CloudDownload, CloudUpload, Server } from "lucide-react";
import { backend } from "@/platform/backend";
import { useAccount } from "@/platform/account";
import type { Role } from "@/platform/modules";
import { latestApproved, nextVersion, pendingDrafts, sameContent, type VersionRow } from "@/lib/clinical/serverContent";
import { logAudit } from "@/lib/clinical/audit";
import { Button, Note, Panel, Pill } from "@/components/calculators/shared";

type Kind = "formulary" | "checklists";
const TABLE: Record<Kind, string> = { formulary: "nap_formulary_versions", checklists: "nap_checklist_versions" };
const CAN_SUBMIT: Record<Kind, Role[]> = {
  formulary: ["admin", "anaesthetist", "icu", "perfusionist"],
  checklists: ["admin", "anaesthetist", "icu", "theatre", "educator", "nurse"],
};
const NAME: Record<Kind, string> = { formulary: "formulary", checklists: "checklist library" };

type Row = VersionRow & { creator?: { full_name: string } | null; approver?: { full_name: string } | null };
const day = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "");

/* Shares hospital content through the server: submit this device's version
   as a draft, an administrator approves it, and every device can switch to the
   newest approved version. Hidden when not signed in. */
export default function ServerVersions({ kind, local, summarize, onApply }: { kind: Kind; local: unknown; summarize: (data: unknown) => string; onApply: (data: unknown, version: number | string) => void }) {
  const { session, profile } = useAccount();
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const hospital = session && profile?.approved ? profile.hospital_id : null;
  const table = TABLE[kind];

  const load = useCallback(async () => {
    if (!hospital) return;
    const base = "id, version, status, created_at, approved_at, data";
    const query = (cols: string) => {
      let q = backend().from(table).select(cols).eq("hospital_id", hospital).order("created_at", { ascending: false }).limit(50);
      if (kind === "checklists") q = q.eq("checklist_key", "library");
      return q;
    };
    // Names of who submitted and approved, when the caller may see them; plain rows otherwise.
    let res = await query(`${base}, creator:nap_profiles!${table}_created_by_fkey(full_name), approver:nap_profiles!${table}_approved_by_fkey(full_name)`);
    if (res.error) res = await query(base);
    setErr(res.error ? res.error.message : null);
    setRows((res.data as unknown as Row[]) ?? []);
  }, [hospital, table, kind]);
  useEffect(() => {
    load();
  }, [load]);

  if (!session) return <Note>Sign in under Staff account to share this {NAME[kind]} with your hospital through the server, with administrator approval.</Note>;
  if (!hospital || !profile) return null;

  const approved = latestApproved(rows);
  const drafts = pendingDrafts(rows);
  const isAdmin = profile.role === "admin";
  const canSubmit = CAN_SUBMIT[kind].includes(profile.role);
  const localIsApproved = approved ? sameContent(approved.data, local) : false;
  const localIsPending = drafts.some((d) => sameContent(d.data, local));

  const submit = async () => {
    const version = nextVersion(rows);
    const row = { hospital_id: hospital, version: kind === "checklists" ? String(version) : version, data: local, created_by: profile.id, ...(kind === "checklists" ? { checklist_key: "library" } : {}) };
    const { error } = await backend().from(table).insert(row);
    setErr(error ? error.message : null);
    if (!error) logAudit(kind === "formulary" ? "formulary-changed" : "checklist-changed", `Submitted ${NAME[kind]} v${version} for approval (${summarize(local)})`);
    load();
  };
  const approve = async (r: Row) => {
    const { error } = await backend().from(table).update({ status: "approved", approved_by: profile.id, approved_at: new Date().toISOString() }).eq("id", r.id);
    setErr(error ? error.message : null);
    if (!error) logAudit(kind === "formulary" ? "formulary-changed" : "checklist-changed", `Approved ${NAME[kind]} v${r.version} (${summarize(r.data)})`);
    load();
  };

  return (
    <Panel title={`Hospital ${NAME[kind]} on the server`} icon={Server}>
      {approved ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Pill tone="ok">Approved v{String(approved.version)}</Pill>
            <span>{summarize(approved.data)}</span>
            <span className="text-muted-foreground">
              approved {day(approved.approved_at)}
              {approved.approver?.full_name ? ` by ${approved.approver.full_name}` : ""}
            </span>
          </div>
          {localIsApproved ? (
            <Note tone="info">This device already uses the approved version.</Note>
          ) : confirm ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                icon={CloudDownload}
                onClick={() => {
                  onApply(approved.data, approved.version);
                  setConfirm(false);
                }}
              >
                Replace this device's {NAME[kind]}
              </Button>
              <Button onClick={() => setConfirm(false)}>Cancel</Button>
            </div>
          ) : (
            <Button icon={CloudDownload} onClick={() => setConfirm(true)}>
              Use the approved version on this device
            </Button>
          )}
        </div>
      ) : (
        <Note>No approved {NAME[kind]} on the server yet.</Note>
      )}

      {canSubmit ? (
        localIsApproved || localIsPending ? null : (
          <Button icon={CloudUpload} onClick={submit}>
            Submit this device's version for approval ({summarize(local)})
          </Button>
        )
      ) : (
        <p className="text-xs text-muted-foreground">Your role can use the approved {NAME[kind]} but not submit changes.</p>
      )}

      {drafts.length ? (
        <ul className="divide-y text-sm">
          {drafts.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
              <Pill tone="warn">Draft v{String(d.version)}</Pill>
              <span className="min-w-0 flex-1">
                {summarize(d.data)}, submitted {day(d.created_at)}
                {d.creator?.full_name ? ` by ${d.creator.full_name}` : ""}
              </span>
              {isAdmin ? (
                <Button variant="primary" icon={CheckCircle2} className="h-9 text-xs" onClick={() => approve(d)}>
                  Approve
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Waiting for an administrator</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {isAdmin && drafts.length ? <Note tone="warn">Approve only after a qualified clinician has checked every concentration, limit and source against the hospital's approved protocols. Approved versions cannot be edited; submit a new version to change them.</Note> : null}
      {err ? <Note tone="warn">{err}</Note> : null}
    </Panel>
  );
}
