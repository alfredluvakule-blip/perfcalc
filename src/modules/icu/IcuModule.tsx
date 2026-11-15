import { Activity, Droplets, Gauge } from "lucide-react";
import { ICU_DAILY, type FormValues } from "@/lib/clinical/forms";
import FormRunner from "@/components/clinical/FormRunner";
import { Note } from "@/components/calculators/shared";
import { useSessionState } from "@/platform/sessionState";

const LINKS = [
  { href: "#/scores", label: "GCS, NEWS2, RASS, CAM-ICU, Braden", icon: Gauge },
  { href: "#/fluids", label: "Fluid balance chart", icon: Droplets },
  { href: "#/infusion", label: "Infusions and syringe pumps", icon: Activity },
];

export default function IcuModule() {
  const [v, setV] = useSessionState<FormValues>("form-icu-daily", {});
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 print:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} className="flex min-h-12 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:border-primary">
            <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {label}
          </a>
        ))}
      </div>
      <FormRunner def={ICU_DAILY} values={v} onChange={setV} />
      <Note>Observation and ventilator charts, SOFA and APACHE II are planned next.</Note>
    </div>
  );
}
