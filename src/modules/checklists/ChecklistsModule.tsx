import { useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckSquare, Download, FilePlus2, History, ListChecks, Printer, Save, Square, Upload } from "lucide-react";
import {
  BUILT_IN,
  REQUESTED,
  addRecord,
  completionRate,
  itemsFromLines,
  linesFromItems,
  loadHospitalChecklists,
  parseChecklistFile,
  progress,
  readRecords,
  saveHospitalChecklists,
  validateChecklist,
  type ChecklistDef,
  type Responses,
} from "@/lib/clinical/checklists";
import { logAudit, newId } from "@/lib/clinical/audit";
import { cn } from "@/lib/utils";
import { useI18n } from "@/platform/i18n";
import { Button, Grid, Note, Panel, Pill, SelectField, TextField } from "@/components/calculators/shared";

const ver = (v: string) => (/^\d/.test(v) ? `v${v}` : v);

const CATS: { id: ChecklistDef["category"]; en: string; sw: string }[] = [
  { id: "theatre", en: "Theatre nursing", sw: "Uuguzi wa chumba cha upasuaji" },
  { id: "anaesthesia", en: "Anaesthesia", sw: "Nusukaputi" },
  { id: "icu", en: "ICU", sw: "ICU" },
  { id: "nursing", en: "General nursing", sw: "Uuguzi wa jumla" },
  { id: "emergency", en: "Emergency", sw: "Dharura" },
];

/* ---------------------------- runner ---------------------------- */

function Runner({ def, onBack }: { def: ChecklistDef; onBack: () => void }) {
  const { lang } = useI18n();
  const [r, setR] = useState<Responses>({});
  const [by, setBy] = useState("");
  const [ref, setRef] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const p = progress(def, r);
  const L = (b: { en: string; sw: string }) => (lang === "sw" && b.sw ? b.sw : b.en);
  const other = (b: { en: string; sw: string }) => (lang === "sw" ? b.en : b.sw);

  const save = () => {
    const rec = { id: newId(), checklistId: def.id, title: def.title.en, version: def.version, at: new Date().toISOString(), by: by.trim() || undefined, done: p.done, total: p.total, outstanding: p.outstanding.map((o) => `${o.section}: ${o.item}`) };
    addRecord(rec);
    logAudit("checklist-completed", `${def.title.en} v${def.version}: ${p.done}/${p.total}${p.complete ? "" : " (incomplete)"}`, by);
    setSaved(new Date().toLocaleTimeString("en-GB"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button icon={ArrowLeft} onClick={onBack}>
          Library
        </Button>
        <Button icon={Printer} onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>
      <section className="rounded-lg border bg-card p-4 print:border-0 print:p-0">
        <h2 className="text-xl font-bold">{L(def.title)}</h2>
        {other(def.title) ? <p className="text-sm text-muted-foreground">{other(def.title)}</p> : null}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Pill>{ver(def.version)}</Pill>
          {def.status === "approved" ? <Pill tone="ok">Approved {def.approvedBy}</Pill> : <Pill tone="warn">Draft: not clinically reviewed</Pill>}
          <Pill tone="info">
            {p.done} / {p.total}
          </Pill>
        </div>
        <Grid cols={2} className="mt-3">
          <TextField label="Bed or reference (printed only, never saved)" value={ref} onChange={setRef} />
          <TextField label="Completed by" value={by} onChange={setBy} />
        </Grid>
        <div className="mt-4 space-y-5">
          {def.sections.map((sec) => (
            <div key={sec.id} className="break-inside-avoid">
              <h3 className="text-base font-semibold">{L(sec.title)}</h3>
              {sec.when ? <p className="mb-2 text-xs text-muted-foreground">{L(sec.when)}</p> : null}
              <ul className="space-y-2">
                {sec.items.map((it) =>
                  it.kind === "text" ? (
                    <li key={it.id}>
                      <label className="mb-1 block text-sm font-medium">{L(it.text)}</label>
                      <textarea
                        value={(r[it.id] as string) ?? ""}
                        onChange={(e) => setR({ ...r, [it.id]: e.target.value })}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </li>
                  ) : (
                    <li key={it.id}>
                      <button
                        type="button"
                        aria-pressed={r[it.id] === true}
                        onClick={() => setR({ ...r, [it.id]: r[it.id] !== true })}
                        className={cn(
                          "flex min-h-12 w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          r[it.id] === true ? "border-emerald-400 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40" : "border-input bg-background hover:bg-muted",
                        )}
                      >
                        {r[it.id] === true ? <CheckSquare className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" /> : <Square className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                        <span>
                          {L(it.text)}
                          {other(it.text) ? <span className="block text-xs text-muted-foreground">{other(it.text)}</span> : null}
                        </span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-snug text-muted-foreground">Source: {def.source}</p>
        <p className="hidden text-[11px] print:block">
          Printed {new Date().toLocaleString("en-GB")} · {ref ? `Ref: ${ref} · ` : ""}Completed by: {by || "—"} · {p.done}/{p.total} items
        </p>
      </section>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="primary" icon={Save} onClick={save}>
          Save completion record
        </Button>
        {saved ? <span className="text-xs text-muted-foreground">Saved at {saved}</span> : null}
        {!p.complete ? <span className="text-xs text-amber-700 dark:text-amber-400">{p.outstanding.length} item(s) not done; they will be listed in the record.</span> : null}
      </div>
    </div>
  );
}

/* ---------------------------- editor ---------------------------- */

interface DraftSection {
  id: string;
  en: string;
  sw: string;
  lines: string;
}

function Editor({ start, onDone }: { start: ChecklistDef | { title: string; category: ChecklistDef["category"] }; onDone: (c: ChecklistDef | null) => void }) {
  const existing = "sections" in start ? start : null;
  const [titleEn, setTitleEn] = useState<string>(existing ? existing.title.en : (start as { title: string }).title);
  const [titleSw, setTitleSw] = useState(existing?.title.sw ?? "");
  const [category, setCategory] = useState<ChecklistDef["category"]>(start.category);
  const [version, setVersion] = useState(existing?.version ?? "1.0");
  const [source, setSource] = useState(existing?.source ?? "");
  const [approvedBy, setApprovedBy] = useState(existing?.approvedBy ?? "");
  const [approvedOn, setApprovedOn] = useState(existing?.approvedOn ?? "");
  const [sections, setSections] = useState<DraftSection[]>(
    existing ? existing.sections.map((s) => ({ id: s.id, en: s.title.en, sw: s.title.sw, lines: linesFromItems(s.items) })) : [{ id: "s1", en: "", sw: "", lines: "" }],
  );

  const def: ChecklistDef = {
    id: existing?.id ?? newId(),
    title: { en: titleEn.trim(), sw: titleSw.trim() },
    category,
    version: version.trim(),
    source: source.trim(),
    origin: "hospital",
    status: approvedBy.trim() ? "approved" : "draft",
    approvedBy: approvedBy.trim() || undefined,
    approvedOn: approvedOn.trim() || undefined,
    sections: sections.map((s) => ({ id: s.id, title: { en: s.en.trim(), sw: s.sw.trim() }, items: itemsFromLines(s.lines) })),
  };
  const problems = validateChecklist(def);

  return (
    <Panel title={existing ? `Edit ${existing.title.en}` : "New hospital checklist"} icon={FilePlus2}>
      <Note>Write items from your hospital's approved protocol. One item per line; add Kiswahili after a bar, for example: Hand hygiene done | Usafi wa mikono umefanyika.</Note>
      <Grid cols={2}>
        <TextField label="Title (English)" value={titleEn} onChange={setTitleEn} />
        <TextField label="Title (Kiswahili)" value={titleSw} onChange={setTitleSw} />
        <SelectField label="Category" value={category} onChange={(v) => setCategory(v as ChecklistDef["category"])} options={CATS.map((c) => ({ value: c.id, label: c.en }))} />
        <TextField label="Version" value={version} onChange={setVersion} />
        <TextField label="Source or protocol (required)" value={source} onChange={setSource} className="col-span-2" />
        <TextField label="Approved by" value={approvedBy} onChange={setApprovedBy} />
        <TextField label="Approved on" value={approvedOn} onChange={setApprovedOn} placeholder="YYYY-MM-DD" />
      </Grid>
      {sections.map((s, i) => (
        <div key={s.id} className="space-y-2 rounded-md border p-3">
          <Grid cols={2}>
            <TextField label={`Section ${i + 1} title (English)`} value={s.en} onChange={(v) => setSections(sections.map((x) => (x.id === s.id ? { ...x, en: v } : x)))} />
            <TextField label="Section title (Kiswahili)" value={s.sw} onChange={(v) => setSections(sections.map((x) => (x.id === s.id ? { ...x, sw: v } : x)))} />
          </Grid>
          <label className="block text-xs font-medium text-muted-foreground" htmlFor={`lines-${s.id}`}>
            Items, one per line
          </label>
          <textarea
            id={`lines-${s.id}`}
            value={s.lines}
            onChange={(e) => setSections(sections.map((x) => (x.id === s.id ? { ...x, lines: e.target.value } : x)))}
            rows={6}
            className="w-full rounded-md border border-input bg-background p-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {sections.length > 1 ? (
            <Button className="h-8 text-xs" onClick={() => setSections(sections.filter((x) => x.id !== s.id))}>
              Remove section
            </Button>
          ) : null}
        </div>
      ))}
      <Button onClick={() => setSections([...sections, { id: `s${Date.now()}`, en: "", sw: "", lines: "" }])}>Add section</Button>
      {problems.length ? (
        <Note tone="warn">
          {problems.map((p) => (
            <div key={p}>{p}</div>
          ))}
        </Note>
      ) : null}
      <div className="flex gap-2">
        <Button variant="primary" icon={Save} disabled={problems.length > 0} onClick={() => onDone(def)}>
          Save checklist
        </Button>
        <Button onClick={() => onDone(null)}>Cancel</Button>
      </div>
    </Panel>
  );
}

/* ---------------------------- library ---------------------------- */

export default function ChecklistsModule() {
  const { lang } = useI18n();
  const [hospital, setHospital] = useState<ChecklistDef[]>(loadHospitalChecklists);
  const [open, setOpen] = useState<ChecklistDef | null>(null);
  const [editing, setEditing] = useState<ChecklistDef | { title: string; category: ChecklistDef["category"] } | null>(null);
  const [view, setView] = useState<"library" | "history">("library");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const records = useMemo(readRecords, [view, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = [...BUILT_IN, ...hospital];
  const match = (t: string) => t.toLowerCase().includes(q.trim().toLowerCase());
  const L = (b: { en: string; sw: string }) => (lang === "sw" && b.sw ? b.sw : b.en);

  const persist = (next: ChecklistDef[], what: string) => {
    setHospital(next);
    saveHospitalChecklists(next);
    logAudit("checklist-changed", what);
  };

  if (open) return <Runner def={open} onBack={() => setOpen(null)} />;
  if (editing)
    return (
      <Editor
        start={editing}
        onDone={(c) => {
          if (c) {
            const exists = hospital.some((h) => h.id === c.id);
            persist(exists ? hospital.map((h) => (h.id === c.id ? c : h)) : [...hospital, c], `${exists ? "Edited" : "Added"} checklist ${c.title.en} v${c.version}`);
          }
          setEditing(null);
        }}
      />
    );

  const exportFile = () => {
    const blob = new Blob([JSON.stringify({ format: "nurseanaesthesia-pro/checklists", version: 1, exportedOn: new Date().toISOString(), checklists: hospital }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `checklists-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (f: File) => {
    const { checklists, problems } = parseChecklistFile(await f.text());
    if (checklists.length) {
      const byId = new Map(hospital.map((h) => [h.id, h]));
      checklists.forEach((c) => byId.set(c.id, c));
      persist([...byId.values()], `Imported ${checklists.length} checklists from ${f.name}`);
    }
    setMsg([`${checklists.length} checklist(s) imported.`, ...problems]);
  };

  const rate = completionRate(records);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={view === "library" ? "primary" : "outline"} icon={ListChecks} onClick={() => setView("library")}>
          Library
        </Button>
        <Button variant={view === "history" ? "primary" : "outline"} icon={History} onClick={() => setView("history")}>
          Completed ({records.length})
        </Button>
        <span className="ml-auto flex gap-2">
          <Button icon={FilePlus2} onClick={() => setEditing({ title: "", category: "icu" })}>
            New
          </Button>
          <Button icon={Upload} onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <Button icon={Download} onClick={exportFile} disabled={!hospital.length}>
            Export
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        </span>
      </div>
      {msg.length ? (
        <Note tone={msg.length > 1 ? "warn" : "ok"}>
          {msg.map((m) => (
            <div key={m}>{m}</div>
          ))}
        </Note>
      ) : null}

      {view === "history" ? (
        <Panel title="Completion records on this device" icon={History} aside={rate !== null ? <Pill tone="info">{Math.round(rate)}% fully complete</Pill> : null}>
          {records.length ? (
            <div className="divide-y rounded-md border text-sm">
              {records.map((r) => (
                <div key={r.id} className="space-y-0.5 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-xs text-muted-foreground">{ver(r.version)}</span>
                    <Pill tone={r.done === r.total ? "ok" : "warn"}>
                      {r.done}/{r.total}
                    </Pill>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.at).toLocaleString("en-GB")}
                    {r.by ? ` · ${r.by}` : ""}
                    {r.outstanding.length ? ` · not done: ${r.outstanding.join("; ")}` : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Note>No checklists completed on this device yet.</Note>
          )}
        </Panel>
      ) : (
        <>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === "sw" ? "Tafuta orodha hakiki" : "Search checklists"}
            className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {CATS.map((cat) => {
            const ready = all.filter((c) => c.category === cat.id && (match(c.title.en) || match(c.title.sw)));
            const waiting = REQUESTED.filter((r) => r.category === cat.id && match(r.title) && !hospital.some((h) => h.title.en.toLowerCase().includes(r.title.toLowerCase())));
            if (!ready.length && !waiting.length) return null;
            return (
              <Panel key={cat.id} title={lang === "sw" ? cat.sw : cat.en} icon={ListChecks}>
                {ready.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ready.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 rounded-md border p-2">
                        <button type="button" onClick={() => setOpen(c)} className="min-h-11 min-w-0 flex-1 rounded px-1 text-left hover:bg-muted">
                          <span className="block font-medium">{L(c.title)}</span>
                          <span className="block text-xs text-muted-foreground">
                            {ver(c.version)} · {c.origin === "built-in" ? "built in" : "hospital"} · {c.status === "approved" ? `approved ${c.approvedBy ?? ""}` : "draft"}
                          </span>
                        </button>
                        {c.origin === "hospital" ? (
                          <Button className="h-8 text-xs" onClick={() => setEditing(c)}>
                            Edit
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {waiting.length ? (
                  <details>
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      {waiting.length} more awaiting your hospital's approved content
                    </summary>
                    <p className="my-2 text-xs text-muted-foreground">These were requested but are not published until written from an approved protocol. Tap one to start it in the editor.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {waiting.map((w) => (
                        <button key={w.title} type="button" onClick={() => setEditing({ title: `${w.title} checklist`, category: w.category })} className="min-h-9 rounded-full border px-3 text-xs hover:bg-muted">
                          {w.title}
                        </button>
                      ))}
                    </div>
                  </details>
                ) : null}
              </Panel>
            );
          })}
        </>
      )}
    </div>
  );
}
