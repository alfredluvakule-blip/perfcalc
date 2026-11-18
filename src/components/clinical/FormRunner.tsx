import { useState } from "react";
import { Printer, RotateCcw } from "lucide-react";
import { filledCount, type FormDef, type FormValues } from "@/lib/clinical/forms";
import { cn } from "@/lib/utils";
import { useI18n } from "@/platform/i18n";
import { Button, NumberField, Pill } from "@/components/calculators/shared";

/* Renders a structured record, prints it, and keeps nothing after the page closes.
   Typed values stay while the app is open so the clinician can switch tools. */

export default function FormRunner({ def, values, onChange, children }: { def: FormDef; values: FormValues; onChange: (v: FormValues) => void; children?: React.ReactNode }) {
  const { lang } = useI18n();
  const L = (x: { en: string; sw: string }) => (lang === "sw" && x.sw ? x.sw : x.en);
  const { filled, total } = filledCount(def, values);
  const set = (id: string, v: FormValues[string]) => onChange({ ...values, [id]: v });
  const [printedAt, setPrintedAt] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button
          variant="primary"
          icon={Printer}
          onClick={() => {
            setPrintedAt(new Date().toLocaleString("en-GB"));
            setTimeout(() => window.print(), 50);
          }}
        >
          Print or save as PDF
        </Button>
        <Button icon={RotateCcw} onClick={() => onChange({})}>
          Clear form
        </Button>
        <Pill tone="info">
          {filled} / {total} completed
        </Pill>
      </div>
      <p className="text-xs text-muted-foreground print:hidden">Kept only while the app is open. Print or save as PDF to file it in the patient record.</p>
      <section className="space-y-5 rounded-lg border bg-card p-4 print:border-0 print:p-0">
        <h2 className="text-xl font-bold">{L(def.title)}</h2>
        {def.sections.map((s) => (
          <div key={s.id} className="break-inside-avoid space-y-3">
            <h3 className="border-b pb-1 text-base font-semibold">{L(s.title)}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {s.fields.map((f) => {
                const id = `${def.id}-${f.id}`;
                const v = values[f.id];
                if (f.kind === "number")
                  return <NumberField key={f.id} label={L(f.label)} unit={f.unit} value={typeof v === "number" ? v : null} onChange={(n) => set(f.id, n)} />;
                if (f.kind === "check")
                  return (
                    <label key={f.id} className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border border-input px-3 py-2.5 text-sm sm:col-span-2">
                      <input type="checkbox" checked={v === true} onChange={(e) => set(f.id, e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" />
                      {L(f.label)}
                    </label>
                  );
                if (f.kind === "choice")
                  return (
                    <fieldset key={f.id} className="sm:col-span-2">
                      <legend className="mb-1 text-xs font-medium text-muted-foreground">{L(f.label)}</legend>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {f.options.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            aria-pressed={v === o.value}
                            onClick={() => set(f.id, v === o.value ? null : o.value)}
                            className={cn(
                              "min-h-11 rounded-md border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              v === o.value ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted print:hidden",
                            )}
                          >
                            <span className="font-semibold">{L(o.label)}</span>
                            {o.detail ? <span className="block text-xs opacity-80">{L(o.detail)}</span> : null}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  );
                return (
                  <div key={f.id} className={cn("min-w-0", f.kind === "textarea" && "sm:col-span-2")}>
                    <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
                      {L(f.label)}
                    </label>
                    {f.kind === "textarea" ? (
                      <textarea id={id} rows={f.rows ?? 3} value={(v as string) ?? ""} onChange={(e) => set(f.id, e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    ) : (
                      <input id={id} type="text" value={(v as string) ?? ""} onChange={(e) => set(f.id, e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {children}
        <p className="text-[11px] leading-snug text-muted-foreground">
          {L(def.title)} v{def.version}. {def.source}
          {printedAt ? ` Printed ${printedAt}.` : ""}
        </p>
      </section>
    </div>
  );
}
