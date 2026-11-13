import { useState } from "react";
import { Check, ClipboardList, Copy, Printer } from "lucide-react";
import { useCase } from "@/context/CaseContext";
import { caseSummary, fmt } from "@/lib/perfusion";
import { HEPARIN, PROTAMINE } from "@/lib/perfusion-data";
import { Button, Grid, NeedPatient, Note, TabIntro, TextField } from "./shared";

function Block({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="border-b border-foreground/30 pb-1 text-xs font-bold uppercase tracking-wide print:border-black">{title}</h3>
      <dl className="mt-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border py-1 print:border-neutral-300">
            <dt className="text-muted-foreground print:text-neutral-700">{k}</dt>
            <dd className="text-right font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** One page of calculated values for the perfusion record. */
const CaseSheet = () => {
  const { state: s, derived: d } = useCase();
  // Identifiers stay in memory only: they are never written to storage.
  const [head, setHead] = useState({ date: new Date().toLocaleDateString("en-GB"), fileNo: "", procedure: "", surgeon: "", perfusionist: "", anaesthetist: "" });
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const framed = typeof window !== "undefined" && window.self !== window.top;

  if (s.weight === null) return <NeedPatient />;

  const text = caseSummary(s, d, {
    Date: head.date,
    "File no.": head.fileNo,
    Procedure: head.procedure,
    Surgeon: head.surgeon,
    Perfusionist: head.perfusionist,
    Anaesthetist: head.anaesthetist,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2500);
  };

  const e = d.equip;

  return (
    <div className="space-y-4">
      <div className="space-y-4 print:hidden">
        <TabIntro>A one-page summary of everything calculated for this patient, for the perfusion record. Fill in the case details, then print or copy.</TabIntro>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <Grid cols={3}>
            <TextField label="Date" value={head.date} onChange={(v) => setHead({ ...head, date: v })} />
            <TextField label="File number" value={head.fileNo} onChange={(v) => setHead({ ...head, fileNo: v })} />
            <TextField label="Procedure" value={head.procedure} onChange={(v) => setHead({ ...head, procedure: v })} className="col-span-2 sm:col-span-1" />
            <TextField label="Surgeon" value={head.surgeon} onChange={(v) => setHead({ ...head, surgeon: v })} />
            <TextField label="Perfusionist" value={head.perfusionist} onChange={(v) => setHead({ ...head, perfusionist: v })} />
            <TextField label="Anaesthetist" value={head.anaesthetist} onChange={(v) => setHead({ ...head, anaesthetist: v })} className="col-span-2 sm:col-span-1" />
          </Grid>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>
              Print sheet
            </Button>
            <Button icon={copied === "done" ? Check : Copy} onClick={copy}>
              {copied === "done" ? "Copied" : copied === "failed" ? "Copy not allowed here" : "Copy as text"}
            </Button>
            <span className="text-xs text-muted-foreground">Case details are not saved on the device.</span>
          </div>
          {framed ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Printing is blocked inside some preview frames. If Print does nothing, use Copy as text, or open the app in its own browser tab.
            </p>
          ) : null}
        </div>
        {s.example ? <Note tone="warn">The sheet below still shows the example patient.</Note> : null}
      </div>

      <article className="rounded-lg border bg-card p-5 shadow-sm print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-foreground pb-2 print:border-black">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ClipboardList className="h-5 w-5 print:hidden" aria-hidden="true" />
              Perfusion calculation sheet
            </h2>
            <p className="text-xs text-muted-foreground print:text-neutral-700">PerfCalc TZ · Cardiovascular Perfusion</p>
          </div>
          <p className="text-sm tabular-nums">{head.date}</p>
        </header>

        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          {(
            [
              ["File no.", head.fileNo],
              ["Procedure", head.procedure],
              ["Surgeon", head.surgeon],
              ["Perfusionist", head.perfusionist],
              ["Anaesthetist", head.anaesthetist],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className="flex gap-2 border-b border-dashed border-border py-1 print:border-neutral-400">
              <dt className="shrink-0 text-muted-foreground print:text-neutral-700">{k}</dt>
              <dd className="min-w-0 break-words font-medium">{v || " "}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 print:grid-cols-2">
          <Block
            title="Patient"
            rows={[
              ["Type", `${s.group === "adult" ? "Adult" : "Paediatric"}, ${s.sex === "M" ? "male" : "female"}`],
              ["Age", s.age !== null ? `${fmt(s.age)} ${s.ageUnit}` : "—"],
              ["Weight / height", `${fmt(s.weight)} kg / ${fmt(s.height)} cm`],
              [`BSA (${s.bsaFormula})`, `${fmt(d.bsa, 2)} m²`],
              ["Estimated blood volume", `${fmt(d.ebv, 0)} mL (${fmt(d.ebvPerKg)} mL/kg)`],
              ["Haematocrit before bypass", `${fmt(s.hct)}%`],
            ]}
          />
          <Block
            title="Flow"
            rows={[
              ["Full flow", `${fmt(d.flow, 2)} L/min`],
              ["Basis", d.basis === "ci" ? `CI ${fmt(d.ci)} L/min/m²` : `${fmt(d.flowPerKg)} mL/kg/min`],
              ["At CI 1.8 / 2.2 / 2.6", d.bsa ? `${fmt(d.bsa * 1.8, 2)} / ${fmt(d.bsa * 2.2, 2)} / ${fmt(d.bsa * 2.6, 2)} L/min` : "—"],
              ["Half flow", d.flow !== null ? `${fmt(d.flow / 2, 2)} L/min` : "—"],
            ]}
          />
          <Block
            title="Prime and haemodilution"
            rows={[
              ["Circuit", s.primeOverride !== null ? "Typed total" : d.preset.label],
              ["Prime volume", `${fmt(d.prime, 0)} mL`],
              ["Predicted Hct on bypass", `${fmt(d.hctCpb, 1)}%`],
              ["Target Hct", `${fmt(d.targetHct)}%`],
              ["Red cells needed", d.rbcMl === null ? "—" : d.rbcMl === 0 ? "None" : `${fmt(d.rbcMl, 0)} mL`],
              ["Prime heparin / mannitol", `${fmt(d.primeHeparinIU, 0)} IU / ${fmt(d.mannitolG, 1)} g`],
            ]}
          />
          <Block
            title="Anticoagulation"
            rows={[
              ["Heparin loading dose", `${fmt(d.heparinIU, 0)} IU (${fmt(s.heparinPerKg)} IU/kg)`],
              ["Volume to draw up", `${fmt(d.heparinMl, 2)} mL of ${fmt(s.heparinVial, 0)} IU/mL`],
              ["ACT target", `Above ${HEPARIN.targetACT} s`],
              ["Protamine", `${fmt(d.protamineMg, 0)} mg (${fmt(d.protamineMl, 1)} mL of ${PROTAMINE.mgPerMl} mg/mL)`],
              ["Protamine ratio", `${fmt(s.protamineRatio)} mg per 100 IU`],
            ]}
          />
          <Block
            title="Cardioplegia and drugs"
            rows={[
              ["Solution", d.cpg.type.label],
              ["Induction volume", `${fmt(d.cpg.volume, 0)} mL`],
              ["Blood / crystalloid", `${fmt(d.cpg.blood, 0)} / ${fmt(d.cpg.crystalloid, 0)} mL`],
              ["Repeat dose", d.cpg.redose !== null ? `${fmt(d.cpg.redose, 0)} mL` : "None"],
              ["Tranexamic acid load / infusion", `${fmt(d.txaLoadMg, 0)} mg / ${fmt(d.txaInfusionMgH, 0)} mg/h`],
            ]}
          />
          <Block
            title="Equipment"
            rows={[
              ["Oxygenator", e.oxygenator ? e.oxygenator.label : "—"],
              ["Arterial × venous line", e.pack ? `${e.pack.arterial}" × ${e.pack.venous}"` : "—"],
              ["Arterial cannula", e.arterial ? `${e.arterial.fr} Fr` : "—"],
              ["Venous cannulae", e.bicaval ? `${e.bicaval.fr} Fr × 2${s.group === "adult" && e.twoStage ? `, or ${e.twoStage.size}` : ""}` : "—"],
            ]}
          />
        </div>

        <div className="mt-6 hidden grid-cols-2 gap-8 text-sm print:grid">
          <p className="border-t border-black pt-1">Perfusionist signature</p>
          <p className="border-t border-black pt-1">Checked by</p>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground print:text-neutral-700">
          Calculated values for reference. Verify each figure and apply clinical judgment before use.
        </p>
      </article>
    </div>
  );
};

export default CaseSheet;
