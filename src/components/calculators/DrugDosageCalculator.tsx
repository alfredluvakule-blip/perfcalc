import { HeartPulse, Pill as PillIcon, ShieldPlus, Syringe } from "lucide-react";
import { useCase } from "@/context/CaseContext";
import { fmt } from "@/lib/perfusion";
import { CARDIOPLEGIA_TYPES, CPB_DRUGS, HEPARIN, PROTAMINE, TXA_PRESETS } from "@/lib/perfusion-data";
import { Button, DoseTable, Formula, Grid, NeedPatient, Note, NumberField, Panel, Pill, Result, SelectField, TabIntro } from "./shared";

const DrugDosageCalculator = () => {
  const { state: s, derived: d, set } = useCase();

  if (s.weight === null) return <NeedPatient />;

  const ratioHigh = (s.protamineRatio ?? 0) > PROTAMINE.range[1];
  const ratioOver = (s.protamineRatio ?? 0) >= PROTAMINE.ceiling;
  const cpgOptions = CARDIOPLEGIA_TYPES.map((t) => ({ value: t.id, label: t.label }));

  return (
    <div className="space-y-4">
      <TabIntro>Doses around bypass for a patient of {fmt(s.weight)} kg. Change any dose per kg to match the protocol; the totals follow.</TabIntro>

      <Panel title="Heparin and protamine" icon={Syringe} aside={<Pill tone="info">ACT target above {HEPARIN.targetACT} s</Pill>}>
        <Grid cols={3}>
          <NumberField
            label="Heparin loading dose"
            unit="IU/kg"
            value={s.heparinPerKg}
            onChange={(v) => set({ heparinPerKg: v })}
            hint={`Usual range ${HEPARIN.loadingRange[0]} to ${HEPARIN.loadingRange[1]}`}
          />
          <SelectField
            label="Heparin vial"
            value={String(s.heparinVial)}
            onChange={(v) => set({ heparinVial: Number(v) })}
            options={HEPARIN.vialIUPerMl.map((v) => ({ value: String(v), label: `${v.toLocaleString("en-GB")} IU/mL` }))}
          />
          <NumberField
            label="Extra heparin given"
            unit="IU"
            value={s.extraHeparin}
            onChange={(v) => set({ extraHeparin: v })}
            placeholder="0"
            hint="Top-up doses during the case"
            className="col-span-2 sm:col-span-1"
          />
        </Grid>
        <Grid cols={2}>
          <Result big tone="info" label="Heparin loading dose" value={fmt(d.heparinIU, 0)} unit="IU" sub={`Draw up ${fmt(d.heparinMl, 2)} mL`} />
          <Result
            big
            tone={ratioOver ? "alert" : ratioHigh ? "warn" : "info"}
            label="Protamine"
            value={fmt(d.protamineMg, 0)}
            unit="mg"
            sub={`${fmt(d.protamineMl, 1)} mL of ${PROTAMINE.mgPerMl} mg/mL, given slowly`}
          />
        </Grid>
        <Grid cols={3}>
          <NumberField
            label="Protamine ratio"
            unit="mg per 100 IU"
            value={s.protamineRatio}
            onChange={(v) => set({ protamineRatio: v })}
            hint={`Usual range ${PROTAMINE.range[0]} to ${PROTAMINE.range[1]}`}
          />
          <Result label="Heparin counted" value={fmt(d.totalHeparinIU, 0)} unit="IU" sub={s.includePrimeHeparin ? "Loading + extra + prime" : "Loading + extra"} />
          <label className="col-span-2 flex h-11 cursor-pointer items-center gap-2 self-end rounded-md border border-input px-3 text-sm sm:col-span-1">
            <input
              type="checkbox"
              checked={s.includePrimeHeparin}
              onChange={(e) => set({ includePrimeHeparin: e.target.checked })}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Count heparin in the prime
          </label>
        </Grid>
        <Formula>
          heparin = {fmt(s.weight)} kg × {fmt(s.heparinPerKg)} IU/kg · protamine = {fmt(d.totalHeparinIU, 0)} IU ÷ 100 × {fmt(s.protamineRatio)} mg
        </Formula>
        {ratioOver ? (
          <Note tone="alert">
            Guidelines advise keeping total protamine below {PROTAMINE.ceiling} mg per 100 IU of heparin: more than that impairs platelets and can
            prolong the ACT.
          </Note>
        ) : (
          <Note>
            Check the ACT 3 to 5 minutes after heparin and before going on bypass. Give protamine only after the surgeon confirms and the pump
            suckers are off; recheck the ACT afterwards.
          </Note>
        )}
      </Panel>

      <Panel
        title="Tranexamic acid"
        icon={ShieldPlus}
        aside={
          <div className="flex gap-1.5">
            {TXA_PRESETS.map((p) => (
              <Button key={p.id} className="h-8 px-2.5 text-xs" onClick={() => set({ txaLoad: p.load, txaInfusion: p.infusion, txaPrime: p.prime })}>
                {p.label}
              </Button>
            ))}
          </div>
        }
      >
        <Grid cols={3}>
          <NumberField label="Loading dose" unit="mg/kg" value={s.txaLoad} onChange={(v) => set({ txaLoad: v })} />
          <NumberField label="Infusion" unit="mg/kg/h" value={s.txaInfusion} onChange={(v) => set({ txaInfusion: v })} />
          <NumberField label="In the prime" unit="mg/kg" value={s.txaPrime} onChange={(v) => set({ txaPrime: v })} className="col-span-2 sm:col-span-1" />
        </Grid>
        <Grid cols={3}>
          <Result label="Loading dose" value={fmt(d.txaLoadMg, 0)} unit="mg" />
          <Result label="Infusion" value={fmt(d.txaInfusionMgH, 0)} unit="mg/h" />
          <Result label="In the prime" value={fmt(d.txaPrimeMg, 0)} unit="mg" className="col-span-2 sm:col-span-1" />
        </Grid>
        <Note>
          Low dose is 10 mg/kg then 1 mg/kg/h; high dose is 30 mg/kg then 16 mg/kg/h. Higher doses carry a seizure risk; reduce the infusion in
          renal impairment.
        </Note>
      </Panel>

      <Panel title="Cardioplegia" icon={HeartPulse}>
        <Grid cols={3}>
          <SelectField
            label="Solution"
            value={s.cpgType}
            onChange={(v) => set({ cpgType: v, cpgDose: null })}
            options={cpgOptions}
            className="col-span-2"
          />
          <NumberField
            label="Induction dose"
            unit="mL/kg"
            value={s.cpgDose}
            onChange={(v) => set({ cpgDose: v })}
            placeholder={`${d.cpg.type.doseMlPerKg} auto`}
            className="col-span-2 sm:col-span-1"
          />
        </Grid>
        <Grid cols={4}>
          <Result
            big
            tone="info"
            label="Induction volume"
            value={fmt(d.cpg.volume, 0)}
            unit="mL"
            sub={d.cpg.capped ? `Capped at the ${fmt(d.cpg.type.maxMl, 0)} mL maximum` : `${fmt(d.cpg.doseMlPerKg)} mL/kg`}
            className="col-span-2"
          />
          <Result label="Blood part" value={fmt(d.cpg.blood, 0)} unit="mL" />
          <Result label="Crystalloid part" value={fmt(d.cpg.crystalloid, 0)} unit="mL" />
        </Grid>
        <Grid cols={2}>
          <Result label="Repeat dose" value={d.cpg.redose !== null ? fmt(d.cpg.redose, 0) : "None"} unit={d.cpg.redose !== null ? "mL" : undefined} sub={d.cpg.type.redose} className="col-span-2" />
        </Grid>
        <Note>{d.cpg.type.note} Delivery pressure and temperature follow the surgeon's and unit's practice.</Note>
      </Panel>

      <Panel title="Other drugs around bypass" icon={PillIcon}>
        <DoseTable rows={CPB_DRUGS} weight={s.weight} group={s.group} />
      </Panel>
    </div>
  );
};

export default DrugDosageCalculator;
