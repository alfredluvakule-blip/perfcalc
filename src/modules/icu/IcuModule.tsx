import { Activity, Droplets, Gauge } from "lucide-react";
import { ICU_DAILY, type FormValues } from "@/lib/clinical/forms";
import { ICU_OBS, VENTILATOR, type ChartRow } from "@/lib/clinical/charts";
import FormRunner from "@/components/clinical/FormRunner";
import ChartLog from "@/components/clinical/ChartLog";
import { Note, Segmented } from "@/components/calculators/shared";
import { useSessionState } from "@/platform/sessionState";

const LINKS = [
  { href: "#/scores/sofa", label: "SOFA, GCS, NEWS2, RASS, CAM-ICU", icon: Gauge },
  { href: "#/fluids", label: "Fluid balance chart", icon: Droplets },
  { href: "#/infusion", label: "Infusions and syringe pumps", icon: Activity },
];

export default function IcuModule() {
  const [tool, setTool] = useSessionState<"daily" | "obs" | "vent">("icu-tool", "daily");
  const [v, setV] = useSessionState<FormValues>("form-icu-daily", {});
  const [obs, setObs] = useSessionState<ChartRow[]>("chart-icu-obs", []);
  const [vent, setVent] = useSessionState<ChartRow[]>("chart-ventilator", []);
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 print:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} className="flex min-h-12 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:border-primary">
            <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {label}
          </a>
        ))}
      </div>
      <Segmented
        label="Record"
        value={tool}
        onChange={setTool}
        options={[
          { value: "daily", label: "Daily review" },
          { value: "obs", label: "Observations" },
          { value: "vent", label: "Ventilator" },
        ]}
      />
      {tool === "daily" ? <FormRunner def={ICU_DAILY} values={v} onChange={setV} /> : null}
      {tool === "obs" ? <ChartLog def={ICU_OBS} rows={obs} onChange={setObs} /> : null}
      {tool === "vent" ? <ChartLog def={VENTILATOR} rows={vent} onChange={setVent} /> : null}
      <Note>APACHE II and arterial blood gas interpretation are planned. Target ranges and alarm limits come from the prescription and local policy; the charts only record.</Note>
    </div>
  );
}
