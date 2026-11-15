import type { ReactNode } from "react";
import { AlertOctagon, AlertTriangle, BookOpen, Info, ListOrdered } from "lucide-react";
import type { ContentMeta } from "@/lib/clinical/content";
import { cn } from "@/lib/utils";
import { Formula, Note } from "@/components/calculators/shared";

/* The parts every calculator must show: inputs, formula, steps, result,
   warnings, source and review status. */

export function InputsTable({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inputs used</h3>
      <dl className="grid grid-cols-1 divide-y rounded-md border text-sm sm:grid-cols-2 sm:divide-y-0">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 px-3 py-1.5 sm:border-b">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Steps({ formula, steps }: { formula?: string; steps: string[] }) {
  if (!steps.length && !formula) return null;
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" /> Formula and steps
      </h3>
      {formula ? <Formula>{formula}</Formula> : null}
      <ol className="list-decimal space-y-1 pl-5 font-mono text-[12px] leading-relaxed">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

export type Sev = "info" | "caution" | "stop";

export function Warnings({ items }: { items: { severity: Sev; text: string }[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2" aria-label="Warnings">
      {items.map((w, i) => {
        const Icon = w.severity === "stop" ? AlertOctagon : w.severity === "caution" ? AlertTriangle : Info;
        return (
          <li
            key={i}
            role={w.severity === "stop" ? "alert" : undefined}
            className={cn(
              "flex gap-2 rounded-md border px-3 py-2 text-sm",
              w.severity === "stop" && "border-red-400 bg-red-50 font-semibold text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300",
              w.severity === "caution" && "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
              w.severity === "info" && "border-primary/30 bg-accent/60",
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{w.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Errors({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <Note tone="warn">
      <ul className="list-disc space-y-0.5 pl-4">
        {items.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </Note>
  );
}

export function SourceBox({ meta }: { meta: ContentMeta }) {
  return (
    <details className="rounded-md border bg-muted/40 text-xs leading-relaxed">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        <span className="flex items-center gap-1.5 font-semibold">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Source and review
        </span>
        <span className={cn("rounded-full border px-2 py-0.5 font-semibold", meta.status === "approved" ? "border-emerald-400 text-emerald-700 dark:text-emerald-400" : "border-amber-400 text-amber-700 dark:text-amber-400")}>
          {meta.status === "approved" ? `Approved by ${meta.reviewedBy} on ${meta.reviewedOn}` : "Draft: not clinically reviewed"}
        </span>
        <span className="text-muted-foreground">
          v{meta.version} · last updated {meta.updatedOn}
        </span>
      </summary>
      <div className="space-y-2 border-t px-3 py-2">
        <p>
          <span className="font-semibold">Population: </span>
          {meta.population}
        </p>
        <div>
          <span className="font-semibold">Sources</span>
          <ul className="list-disc pl-4">
            {meta.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="font-semibold">Limitations</span>
          <ul className="list-disc pl-4">
            {meta.limitations.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
