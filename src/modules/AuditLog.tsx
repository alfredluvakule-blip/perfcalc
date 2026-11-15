import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { readAudit, type AuditEvent } from "@/lib/clinical/audit";
import { Note, Panel, Pill } from "@/components/calculators/shared";

const LABEL: Record<AuditEvent["type"], string> = {
  "calculation-confirmed": "Calculation",
  "double-check": "Double check",
  "label-printed": "Label printed",
  "formulary-changed": "Formulary",
  "fluid-entry": "Fluid entry",
  "score-recorded": "Score",
  "checklist-completed": "Checklist",
  "checklist-changed": "Checklist edited",
};

export default function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>(readAudit);
  useEffect(() => {
    const on = () => setEvents(readAudit());
    window.addEventListener("nap-audit", on);
    return () => window.removeEventListener("nap-audit", on);
  }, []);
  return (
    <Panel title={`Audit log on this device (${events.length})`} icon={History}>
      <Note>Kept on this device only, newest first, up to 500 events. A server audit log that cannot be edited comes with accounts in a later phase.</Note>
      {events.length ? (
        <div className="divide-y rounded-md border text-sm">
          {events.map((e) => (
            <div key={e.id} className="space-y-0.5 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="tabular-nums">{new Date(e.at).toLocaleString("en-GB")}</span>
                <Pill tone={/MISMATCH/.test(e.summary) ? "alert" : "info"}>{LABEL[e.type]}</Pill>
                {e.by ? <span>by {e.by}</span> : null}
              </div>
              <div className="break-words">{e.summary}</div>
            </div>
          ))}
        </div>
      ) : (
        <Note>Nothing recorded yet.</Note>
      )}
    </Panel>
  );
}
