import { useEffect, useId, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { doseForWeight, fmt, type Group } from "@/lib/perfusion";
import type { DoseRow } from "@/lib/perfusion-data";

/* Small building blocks shared by every calculator tab. They use only the
   project's theme tokens, so they follow whatever theme the app has. */

export type Tone = "neutral" | "ok" | "warn" | "alert" | "info";

const toneText: Record<Tone, string> = {
  neutral: "text-foreground",
  ok: "text-emerald-700 dark:text-emerald-400",
  warn: "text-amber-700 dark:text-amber-400",
  alert: "text-red-700 dark:text-red-400",
  info: "text-primary",
};

const toneBox: Record<Tone, string> = {
  neutral: "border-border bg-muted/50",
  ok: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  warn: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  alert: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
  info: "border-primary/30 bg-accent/60",
};

export function Panel({
  title,
  icon: Icon,
  aside,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          {Icon ? <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
          {title}
        </h2>
        {aside}
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

export function TabIntro({ children }: { children: ReactNode }) {
  return <p className="max-w-[65ch] text-sm text-muted-foreground">{children}</p>;
}

/** Number input that tolerates half-typed values ("1." or empty). */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  placeholder,
  hint,
  className,
  allowNegative,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  placeholder?: string;
  hint?: ReactNode;
  className?: string;
  allowNegative?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(value === null ? "" : String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value === null ? "" : String(value));
  }, [value, focused]);

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex h-11 items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
        <input
          id={id}
          type="text"
          inputMode={allowNegative ? "text" : "decimal"}
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const raw = e.target.value.replace(",", ".");
            if (!/^-?\d*\.?\d*$/.test(raw)) return;
            if (!allowNegative && raw.startsWith("-")) return;
            setText(raw);
            const n = parseFloat(raw);
            onChange(raw === "" || Number.isNaN(n) ? null : n);
          }}
          className="h-full w-full min-w-0 rounded-md bg-transparent px-3 text-base font-medium tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
        />
        {unit ? <span className="shrink-0 pr-3 text-xs text-muted-foreground">{unit}</span> : null}
      </div>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div role="group" aria-label={label} className="flex h-11 rounded-md border border-input bg-muted p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 whitespace-nowrap rounded px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === o.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "outline",
  className,
  disabled,
  icon: Icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "outline" | "primary" | "ghost";
  className?: string;
  disabled?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" && "border border-input bg-background hover:bg-muted",
        variant === "ghost" && "text-primary hover:bg-accent",
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** A calculated value. `big` is for the one or two figures the tab is about. */
export function Result({
  label,
  value,
  unit,
  sub,
  tone = "neutral",
  big,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: ReactNode;
  tone?: Tone;
  big?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-md border px-3 py-2.5", toneBox[tone], className)}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 flex flex-wrap items-baseline gap-x-1.5 font-semibold tabular-nums", toneText[tone], big ? "text-3xl" : "text-xl")}>
        <span className="break-words">{value}</span>
        {unit ? <span className="text-sm font-medium text-muted-foreground">{unit}</span> : null}
      </div>
      {sub ? <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", toneBox[tone], toneText[tone])}>
      {children}
    </span>
  );
}

export function Note({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cn("rounded-md border px-3 py-2 text-xs leading-relaxed", toneBox[tone])}>{children}</div>;
}

/** Shows the working, so the result can be checked by hand. */
export function Formula({ children }: { children: ReactNode }) {
  return (
    <p className="overflow-x-auto whitespace-nowrap rounded bg-muted px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground no-scrollbar">
      {children}
    </p>
  );
}

export function NeedPatient({ what = "weight" }: { what?: string }) {
  return <Note tone="warn">Enter the patient's {what} in the patient strip above to see these values.</Note>;
}

export function Grid({ children, cols = 3, className }: { children: ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-3",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-2 sm:grid-cols-3",
        cols === 4 && "grid-cols-2 md:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Weight-based dose list. Rows stack on a phone, line up as a table on wider screens. */
export function DoseTable({ rows, weight, group }: { rows: DoseRow[]; weight: number | null; group: Group }) {
  return (
    <div className="divide-y rounded-md border">
      <div className="hidden grid-cols-[1.3fr_1fr_1.1fr_1.8fr] gap-3 bg-muted/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
        <span>Drug</span>
        <span>Per kg</span>
        <span>This patient</span>
        <span>Notes</span>
      </div>
      {rows.map((row) => {
        const dose = doseForWeight(row, weight, group);
        const perKg = `${fmt(row.low)}${row.high !== undefined ? ` to ${fmt(row.high)}` : ""} ${row.unit}/kg`;
        return (
          <div key={row.drug} className="grid grid-cols-2 gap-x-3 gap-y-0.5 px-3 py-2.5 text-sm sm:grid-cols-[1.3fr_1fr_1.1fr_1.8fr]">
            <span className="font-medium">{row.drug}</span>
            <span className="text-right text-xs text-muted-foreground tabular-nums sm:order-none sm:text-left sm:text-sm">{perKg}</span>
            <span className="col-span-2 font-semibold tabular-nums text-primary sm:col-span-1">
              {dose.text}
              {dose.capped ? <span className="ml-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">max {fmt(row.max)} {row.unit}</span> : null}
            </span>
            <span className="col-span-2 text-xs leading-snug text-muted-foreground sm:col-span-1">
              {row.note ?? (row.max !== undefined && !dose.capped ? `Maximum ${fmt(row.max)} ${row.unit}.` : "")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function KeyValueTable({ rows, head }: { rows: [string, ReactNode][]; head?: [string, string] }) {
  return (
    <div className="divide-y rounded-md border text-sm">
      {head ? (
        <div className="grid grid-cols-[1.2fr_1fr] gap-3 bg-muted/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>{head[0]}</span>
          <span>{head[1]}</span>
        </div>
      ) : null}
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[1.2fr_1fr] gap-3 px-3 py-2">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-medium tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  );
}
