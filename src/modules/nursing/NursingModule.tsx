import { BedDouble, Droplets, Footprints, ListChecks, MessageSquareText, ShieldPlus } from "lucide-react";
import { CARE_PLAN, DISCHARGE_PLAN, NURSING_ADMISSION, type FormValues } from "@/lib/clinical/forms";
import FormRunner from "@/components/clinical/FormRunner";
import { Note, Segmented } from "@/components/calculators/shared";
import { useSessionState } from "@/platform/sessionState";

const LINKS = [
  { href: "#/scores/braden", label: "Braden pressure risk", icon: ShieldPlus },
  { href: "#/scores/morse", label: "Morse falls risk", icon: Footprints },
  { href: "#/pressure", label: "Repositioning and wounds", icon: BedDouble },
  { href: "#/fluids", label: "Fluid balance", icon: Droplets },
  { href: "#/checklists", label: "SBAR handover and checklists", icon: MessageSquareText },
  { href: "#/scores/news2", label: "NEWS2 early warning", icon: ListChecks },
];

export default function NursingModule() {
  const [tool, setTool] = useSessionState<"admission" | "plan" | "discharge">("nu-tool", "admission");
  const [adm, setAdm] = useSessionState<FormValues>("form-nursing-admission", {});
  const [plan, setPlan] = useSessionState<FormValues>("form-care-plan", {});
  const [dis, setDis] = useSessionState<FormValues>("form-discharge-plan", {});
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
          { value: "admission", label: "Admission" },
          { value: "plan", label: "Care plan" },
          { value: "discharge", label: "Discharge" },
        ]}
      />
      {tool === "admission" ? <FormRunner def={NURSING_ADMISSION} values={adm} onChange={setAdm} /> : null}
      {tool === "plan" ? <FormRunner def={CARE_PLAN} values={plan} onChange={setPlan} /> : null}
      {tool === "discharge" ? <FormRunner def={DISCHARGE_PLAN} values={dis} onChange={setDis} /> : null}
      <Note>A medication administration record needs secure accounts and storage, so it comes with the server phase.</Note>
    </div>
  );
}
