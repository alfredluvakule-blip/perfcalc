import { useEffect, useState } from "react";
import { Bell, BedDouble, FileText, Plus, Printer, RotateCw, Trash2 } from "lucide-react";
import { NPIAP_SOURCE, NPIAP_STAGES, nextTurnDue, turnCompliance, type PressureState, type WoundEntry } from "@/lib/clinical/forms";
import { BRADEN } from "@/lib/clinical/scores";
import { newId } from "@/lib/clinical/audit";
import { show } from "@/lib/clinical/units";
import { useI18n } from "@/platform/i18n";
import { Button, Grid, Note, NumberField, Panel, Pill, Result, SelectField, TextField } from "@/components/calculators/shared";

const KEY = "nap-pressure-v1";
const POSITIONS = ["Left side 30°", "Right side 30°", "Supine", "Prone", "Sitting out", "Other"];

function load(): PressureState {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (v && typeof v === "object") return v;
  } catch {
    /* ignore */
  }
  return { bed: "", braden: null, intervalMin: null, mattress: "", nutrition: "", turns: [], wounds: [] };
}

function localInput(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function PressureModule() {
  const { lang } = useI18n();
  const [s, setS] = useState<PressureState>(load);
  const [now, setNow] = useState(Date.now());
  const [position, setPosition] = useState(POSITIONS[0]);
  const [by, setBy] = useState("");
  const [w, setW] = useState<Partial<WoundEntry>>({ stage: "1" });
  const [reportStart, setReportStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() < 8 ? -16 : 8, 0, 0, 0);
    return localInput(d);
  });
  const [notify, setNotify] = useState(() => typeof Notification !== "undefined" && Notification.permission === "granted");

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const due = nextTurnDue(s);
  const overdue = due !== null && due.getTime() <= now;

  // Browser notification when the turn falls due while the app is open.
  useEffect(() => {
    if (!due || !notify || typeof Notification === "undefined") return;
    const ms = due.getTime() - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => {
      try {
        new Notification("Repositioning due", { body: `${s.bed ? `Bed ${s.bed}: ` : ""}reposition the patient now.`, tag: "nap-turn" });
      } catch {
        /* some browsers only allow notifications from a service worker */
      }
    }, ms);
    return () => clearTimeout(t);
  }, [due?.getTime(), notify, s.bed]); // eslint-disable-line react-hooks/exhaustive-deps

  const band = s.braden !== null ? BRADEN.bands.find((b) => s.braden! >= b.min && s.braden! <= b.max) : null;
  const comp = turnCompliance(s.turns, new Date(reportStart), s.intervalMin);
  const stageLabel = (v: string) => {
    const st = NPIAP_STAGES.find((x) => x.value === v);
    return st ? (lang === "sw" ? st.label.sw : st.label.en) : v;
  };

  const addWound = () => {
    if (!w.location?.trim()) return;
    setS({ ...s, wounds: [{ id: newId(), at: new Date().toISOString(), location: w.location.trim(), stage: w.stage ?? "1", lengthCm: w.lengthCm ?? null, widthCm: w.widthCm ?? null, depthCm: w.depthCm ?? null, exudate: w.exudate, dressing: w.dressing, note: w.note }, ...s.wounds] });
    setW({ stage: w.stage });
  };

  return (
    <div className="space-y-4">
      <Note>Kept on this device for one patient at a time; use a bed number, not a name. Clear it when the patient leaves.</Note>
      <Panel title="Risk and prevention plan" icon={BedDouble} aside={<Button className="h-8 text-xs" icon={Trash2} onClick={() => setS({ bed: "", braden: null, intervalMin: null, mattress: "", nutrition: "", turns: [], wounds: [] })}>New patient</Button>}>
        <Grid cols={3}>
          <TextField label="Bed" value={s.bed} onChange={(v) => setS({ ...s, bed: v })} />
          <NumberField label="Braden total (6 to 23)" value={s.braden} onChange={(v) => setS({ ...s, braden: v })} hint={<a className="underline" href="#/scores">Score it in Clinical scores</a>} />
          <NumberField label="Reposition every" unit="min" value={s.intervalMin} onChange={(v) => setS({ ...s, intervalMin: v })} hint="From the care plan or local policy" className="col-span-2 sm:col-span-1" />
          <TextField label="Pressure-relieving mattress or surface" value={s.mattress} onChange={(v) => setS({ ...s, mattress: v })} className="col-span-2 sm:col-span-1" />
          <TextField label="Nutrition and hydration" value={s.nutrition} onChange={(v) => setS({ ...s, nutrition: v })} className="col-span-2" />
        </Grid>
        {band ? (
          <Note tone={band.tone}>
            <strong>{band.label}.</strong> {band.action ?? ""}
          </Note>
        ) : s.braden !== null ? (
          <Note tone="warn">Braden totals run from 6 to 23.</Note>
        ) : null}
      </Panel>

      <Panel
        title="Repositioning"
        icon={RotateCw}
        aside={overdue ? <Pill tone="alert">Overdue</Pill> : due ? <Pill tone="info">Next {due.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</Pill> : null}
      >
        {overdue ? (
          <div role="alert" className="rounded-md border border-red-400 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
            Repositioning was due at {due!.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} ({Math.round((now - due!.getTime()) / 60000)} min ago).
          </div>
        ) : null}
        {!s.intervalMin ? <Note tone="warn">Set the repositioning interval from the care plan to get reminders.</Note> : null}
        <Grid cols={3}>
          <SelectField label="New position" value={position} onChange={setPosition} options={POSITIONS.map((p) => ({ value: p, label: p }))} />
          <TextField label="By (initials)" value={by} onChange={setBy} />
          <Button variant="primary" icon={RotateCw} className="col-span-2 h-11 self-end sm:col-span-1" onClick={() => setS({ ...s, turns: [{ id: newId(), at: new Date().toISOString(), position, by: by.trim() || undefined }, ...s.turns] })}>
            Repositioned now
          </Button>
        </Grid>
        {typeof Notification !== "undefined" && !notify ? (
          <Button icon={Bell} onClick={() => Notification.requestPermission().then((p) => setNotify(p === "granted"))}>
            Allow reminder notifications
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">Reminders show while the app is open on this device. They are an aid, not a replacement for the ward's turning chart.</p>
        {s.turns.length ? (
          <div className="max-h-64 divide-y overflow-y-auto rounded-md border text-sm">
            {s.turns.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-28 shrink-0 tabular-nums text-muted-foreground">{new Date(t.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="flex-1">{t.position}</span>
                <span className="text-xs text-muted-foreground">{t.by ?? ""}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel title="Skin and wound assessment" icon={Plus}>
        <Grid cols={3}>
          <TextField label="Location" value={w.location ?? ""} onChange={(v) => setW({ ...w, location: v })} placeholder="e.g. sacrum, left heel" />
          <SelectField label="Stage (NPIAP)" value={w.stage ?? "1"} onChange={(v) => setW({ ...w, stage: v })} options={NPIAP_STAGES.map((st) => ({ value: st.value, label: lang === "sw" ? st.label.sw : st.label.en }))} className="col-span-2" />
          <NumberField label="Length" unit="cm" value={w.lengthCm ?? null} onChange={(v) => setW({ ...w, lengthCm: v })} />
          <NumberField label="Width" unit="cm" value={w.widthCm ?? null} onChange={(v) => setW({ ...w, widthCm: v })} />
          <NumberField label="Depth" unit="cm" value={w.depthCm ?? null} onChange={(v) => setW({ ...w, depthCm: v })} className="col-span-2 sm:col-span-1" />
          <TextField label="Exudate" value={w.exudate ?? ""} onChange={(v) => setW({ ...w, exudate: v })} />
          <TextField label="Dressing applied" value={w.dressing ?? ""} onChange={(v) => setW({ ...w, dressing: v })} className="col-span-2" />
        </Grid>
        <Note>{NPIAP_STAGES.find((x) => x.value === (w.stage ?? "1"))?.detail[lang === "sw" ? "sw" : "en"]}</Note>
        <Button variant="primary" icon={Plus} onClick={addWound} disabled={!w.location?.trim()}>
          Add assessment
        </Button>
        <p className="text-xs text-muted-foreground">Wound photographs will be added with the secure server, where consent and privacy can be enforced. {NPIAP_SOURCE}</p>
      </Panel>

      <Panel title="Daily pressure injury prevention report" icon={FileText} aside={<Button icon={Printer} onClick={() => window.print()}>Print</Button>}>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="pi-start">
            24 hours from
          </label>
          <input id="pi-start" type="datetime-local" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm print:hidden" />
        </div>
        <Grid cols={4}>
          <Result label="Braden" value={s.braden !== null ? String(s.braden) : "—"} sub={band?.label} />
          <Result label="Turns recorded" value={String(comp.count)} sub={comp.expected !== null ? `${comp.expected} expected at every ${s.intervalMin} min` : "No interval set"} tone={comp.expected !== null && comp.count < comp.expected ? "warn" : "neutral"} />
          <Result label="Longest gap" value={comp.longestGapMin !== null ? show(comp.longestGapMin, 0) : "—"} unit="min" tone={s.intervalMin && comp.longestGapMin !== null && comp.longestGapMin > s.intervalMin ? "warn" : "neutral"} />
          <Result label="Late turns" value={String(comp.lateTurns)} tone={comp.lateTurns ? "warn" : "ok"} />
        </Grid>
        <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Bed</dt>
          <dd>{s.bed || "—"}</dd>
          <dt className="text-muted-foreground">Surface</dt>
          <dd>{s.mattress || "—"}</dd>
          <dt className="text-muted-foreground">Nutrition</dt>
          <dd>{s.nutrition || "—"}</dd>
        </dl>
        {s.wounds.length ? (
          <div className="divide-y rounded-md border text-sm">
            {s.wounds.map((x) => (
              <div key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2">
                <span className="tabular-nums text-muted-foreground">{new Date(x.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="font-medium">{x.location}</span>
                <Pill tone="warn">{stageLabel(x.stage)}</Pill>
                <span className="text-xs text-muted-foreground">
                  {[x.lengthCm, x.widthCm, x.depthCm].some((n) => n != null) ? `${show(x.lengthCm)} × ${show(x.widthCm)} × ${show(x.depthCm)} cm` : ""}
                  {x.exudate ? ` · exudate ${x.exudate}` : ""}
                  {x.dressing ? ` · ${x.dressing}` : ""}
                </span>
                <button type="button" aria-label="Delete assessment" className="ml-auto flex h-8 w-8 items-center justify-center rounded hover:bg-muted print:hidden" onClick={() => setS({ ...s, wounds: s.wounds.filter((y) => y.id !== x.id) })}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Note>No wounds recorded.</Note>
        )}
      </Panel>
    </div>
  );
}
