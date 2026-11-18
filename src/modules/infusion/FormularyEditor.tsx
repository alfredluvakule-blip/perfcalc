import { useRef, useState } from "react";
import { ClipboardCheck, Download, Plus, Trash2, Upload } from "lucide-react";
import { exportFormulary, loadFormulary, parseFormularyFile, saveFormulary, validateEntry, type FormularyEntry, type Population, type RouteRule } from "@/lib/clinical/formulary";
import { AMOUNT_UNITS, DOSE_UNITS, show, type AmountUnit } from "@/lib/clinical/units";
import { logAudit, newId } from "@/lib/clinical/audit";
import ServerVersions from "@/components/clinical/ServerVersions";
import { Button, Grid, Note, NumberField, Panel, Pill, SelectField, TextField } from "@/components/calculators/shared";

const blank = (): FormularyEntry => ({ id: newId(), drug: "", population: "adult", doseUnit: "mcg/kg/min", concentrations: [], route: "unspecified", source: "" });

export default function FormularyEditor() {
  const [entries, setEntries] = useState<FormularyEntry[]>(loadFormulary);
  const [draft, setDraft] = useState<FormularyEntry>(blank);
  const [conc, setConc] = useState<{ amount: number | null; unit: AmountUnit; volumeMl: number | null }>({ amount: null, unit: "mg", volumeMl: null });
  const [msg, setMsg] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const commit = (next: FormularyEntry[], what: string) => {
    setEntries(next);
    saveFormulary(next);
    logAudit("formulary-changed", what);
  };

  const problems = validateEntry(draft);
  const save = () => {
    if (problems.length) return;
    const exists = entries.some((e) => e.id === draft.id);
    commit(exists ? entries.map((e) => (e.id === draft.id ? draft : e)) : [...entries, draft], `${exists ? "Edited" : "Added"} ${draft.drug} (${draft.doseUnit}, ${draft.population})`);
    setDraft(blank());
  };

  const addConc = () => {
    if (!conc.amount || !conc.volumeMl) return;
    setDraft({ ...draft, concentrations: [...draft.concentrations, { amount: conc.amount, unit: conc.unit, volumeMl: conc.volumeMl }] });
    setConc({ ...conc, amount: null, volumeMl: null });
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(exportFormulary(entries), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `formulary-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (f: File) => {
    const { entries: imported, problems: p } = parseFormularyFile(await f.text());
    if (imported.length) {
      const byId = new Map(entries.map((e) => [e.id, e]));
      imported.forEach((e) => byId.set(e.id, e));
      commit([...byId.values()], `Imported ${imported.length} entries from ${f.name}`);
    }
    setMsg([`${imported.length} entr${imported.length === 1 ? "y" : "ies"} imported.`, ...p]);
  };

  const lim = (k: "softMin" | "softMax" | "hardMin" | "hardMax", label: string) => (
    <NumberField label={label} unit={draft.doseUnit} value={draft[k] ?? null} onChange={(v) => setDraft({ ...draft, [k]: v })} />
  );

  return (
    <div className="space-y-4">
      <Note tone="warn">
        The formulary is empty until your hospital adds entries. Only enter concentrations, limits and route rules from an approved local protocol, and name it as the source.
        Entries are saved on this device; export a file to share them with other devices. A shared server formulary comes with accounts in a later phase.
      </Note>

      <Panel
        title={`Entries (${entries.length})`}
        icon={ClipboardCheck}
        aside={
          <div className="flex gap-2">
            <Button icon={Upload} onClick={() => fileRef.current?.click()} className="h-8 text-xs">
              Import
            </Button>
            <Button icon={Download} onClick={download} disabled={!entries.length} className="h-8 text-xs">
              Export
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          </div>
        }
      >
        {msg.length ? (
          <Note tone={msg.length > 1 ? "warn" : "ok"}>
            {msg.map((m) => (
              <div key={m}>{m}</div>
            ))}
          </Note>
        ) : null}
        {entries.length ? (
          <div className="divide-y rounded-md border text-sm">
            {entries.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="font-semibold">{e.drug}</span>
                <Pill>{e.population}</Pill>
                <span className="text-muted-foreground">{e.doseUnit}</span>
                {e.route === "central-only" ? <Pill tone="warn">central only</Pill> : null}
                {e.approvedBy ? <Pill tone="ok">approved {e.approvedBy}</Pill> : <Pill tone="warn">not approved</Pill>}
                <span className="ml-auto flex gap-1">
                  <Button className="h-8 text-xs" onClick={() => setDraft(e)}>
                    Edit
                  </Button>
                  <button type="button" aria-label={`Delete ${e.drug}`} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted" onClick={() => commit(entries.filter((x) => x.id !== e.id), `Deleted ${e.drug}`)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Note>No entries yet.</Note>
        )}
      </Panel>

      <Panel title={entries.some((e) => e.id === draft.id) ? `Edit ${draft.drug}` : "Add an entry"} icon={Plus}>
        <Grid cols={3}>
          <TextField label="Drug" value={draft.drug} onChange={(v) => setDraft({ ...draft, drug: v })} />
          <SelectField
            label="Population"
            value={draft.population}
            onChange={(v) => setDraft({ ...draft, population: v as Population })}
            options={[
              { value: "adult", label: "Adult" },
              { value: "paediatric", label: "Child" },
              { value: "neonatal", label: "Neonate" },
              { value: "any", label: "Any" },
            ]}
          />
          <SelectField label="Dose unit" value={draft.doseUnit} onChange={(v) => setDraft({ ...draft, doseUnit: v })} options={DOSE_UNITS.map((u) => ({ value: u, label: u }))} className="col-span-2 sm:col-span-1" />
        </Grid>
        <div className="space-y-2">
          <span className="block text-xs font-medium text-muted-foreground">Approved concentrations</span>
          {draft.concentrations.map((c, i) => (
            <div key={i} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
              {show(c.amount)} {c.unit} in {show(c.volumeMl)} mL ({show(c.amount / c.volumeMl)} {c.unit}/mL)
              <button type="button" aria-label="Remove concentration" onClick={() => setDraft({ ...draft, concentrations: draft.concentrations.filter((_, j) => j !== i) })} className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          <Grid cols={4}>
            <NumberField label="Amount" value={conc.amount} onChange={(v) => setConc({ ...conc, amount: v })} />
            <SelectField label="Unit" value={conc.unit} onChange={(v) => setConc({ ...conc, unit: v as AmountUnit })} options={AMOUNT_UNITS.map((u) => ({ value: u, label: u }))} />
            <NumberField label="In volume" unit="mL" value={conc.volumeMl} onChange={(v) => setConc({ ...conc, volumeMl: v })} />
            <Button icon={Plus} onClick={addConc} className="self-end" disabled={!conc.amount || !conc.volumeMl}>
              Add
            </Button>
          </Grid>
        </div>
        <Grid cols={4}>
          {lim("softMin", "Usual min")}
          {lim("softMax", "Usual max")}
          {lim("hardMin", "Hard min")}
          {lim("hardMax", "Hard max")}
        </Grid>
        <Grid cols={2}>
          <SelectField
            label="Route rule"
            value={draft.route}
            onChange={(v) => setDraft({ ...draft, route: v as RouteRule })}
            options={[
              { value: "unspecified", label: "Not specified" },
              { value: "peripheral-allowed", label: "Peripheral allowed" },
              { value: "central-only", label: "Central line only" },
            ]}
          />
          <TextField label="Route note" value={draft.routeNote ?? ""} onChange={(v) => setDraft({ ...draft, routeNote: v })} />
          <TextField label="Source or protocol (required)" value={draft.source} onChange={(v) => setDraft({ ...draft, source: v })} className="col-span-2" />
          <TextField label="Approved by" value={draft.approvedBy ?? ""} onChange={(v) => setDraft({ ...draft, approvedBy: v })} />
          <TextField label="Approved on" value={draft.approvedOn ?? ""} onChange={(v) => setDraft({ ...draft, approvedOn: v })} placeholder="YYYY-MM-DD" />
        </Grid>
        {problems.length && draft.drug ? (
          <Note tone="warn">
            {problems.map((p) => (
              <div key={p}>{p}</div>
            ))}
          </Note>
        ) : null}
        <div className="flex gap-2">
          <Button variant="primary" onClick={save} disabled={problems.length > 0}>
            Save entry
          </Button>
          <Button onClick={() => setDraft(blank())}>Clear</Button>
        </div>
      </Panel>
      <ServerVersions
        kind="formulary"
        local={{ ...exportFormulary(entries), exportedOn: "" }}
        summarize={(d) => {
          const n = Array.isArray((d as { entries?: unknown[] })?.entries) ? (d as { entries: unknown[] }).entries.length : 0;
          return `${n} entr${n === 1 ? "y" : "ies"}`;
        }}
        onApply={(d, v) => {
          const { entries: next, problems: p } = parseFormularyFile(JSON.stringify(d));
          commit(next, `Applied hospital formulary v${v} from the server (${next.length} entries)`);
          setMsg([`Now using the approved hospital formulary v${v}.`, ...p]);
        }}
      />
    </div>
  );
}
