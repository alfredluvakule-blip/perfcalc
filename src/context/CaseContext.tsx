import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_CASE, PAED_EXAMPLE, deriveCase, type CaseState, type Derived, type Group } from "@/lib/perfusion";
import { CIRCUIT_PRESETS, type CircuitPresetId, type PrimeParts, type TubingRow } from "@/lib/perfusion-data";

const STORAGE_KEY = "perfcalc-tz-case-v1";
const THEME_KEY = "perfcalc-tz-theme";

export type Theme = "light" | "dark";

interface CaseContextValue {
  state: CaseState;
  derived: Derived;
  /** Change calculator settings. */
  set: (patch: Partial<CaseState>) => void;
  /** Change patient details; clears the "example" flag. */
  setPatient: (patch: Partial<CaseState>) => void;
  setGroup: (group: Group) => void;
  /** Edit the circuit; the first edit detaches it from "follow patient size". */
  editPrime: (edit: (parts: PrimeParts, tubing: TubingRow[]) => { parts?: PrimeParts; tubing?: TubingRow[] }) => void;
  loadPreset: (id: CircuitPresetId) => void;
  loadExample: (group: Group) => void;
  clearPatient: () => void;
  /** Back to factory defaults, including circuit and protocol settings. */
  resetAll: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

/** Values that belong to one case and should not carry over to the next patient. */
const PER_CASE_RESET: Partial<CaseState> = {
  ebvPerKg: null,
  ci: null,
  flowBasis: "auto",
  flowPerKg: null,
  targetHct: null,
  primeOverride: null,
  extraHeparin: null,
  cpgDose: null,
};

const CaseContext = createContext<CaseContextValue | null>(null);

// Numbers only: no names or identifiers are ever stored on the device.
function loadState(): CaseState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CASE, ...(JSON.parse(raw) as Partial<CaseState>) };
  } catch {
    /* storage unavailable: start from the example */
  }
  return DEFAULT_CASE;
}

function initialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  const host = document.documentElement.getAttribute("data-theme");
  if (host === "light" || host === "dark") return host;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function CaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CaseState>(loadState);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Follow the host page's theme until the user picks one here.
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      let chosen: string | null = null;
      try {
        chosen = window.localStorage.getItem(THEME_KEY);
      } catch {
        /* ignore */
      }
      const host = root.getAttribute("data-theme");
      if (!chosen && (host === "light" || host === "dark")) setTheme(host);
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const set = useCallback((patch: Partial<CaseState>) => setState((s) => ({ ...s, ...patch })), []);
  const setPatient = useCallback((patch: Partial<CaseState>) => setState((s) => ({ ...s, ...patch, example: false })), []);

  const setGroup = useCallback(
    (group: Group) =>
      // Defaults for flow, haematocrit target and blood volume differ by group, so drop the overrides.
      setState((s) => ({ ...s, group, ci: null, flowPerKg: null, flowBasis: "auto", targetHct: null, ebvPerKg: null })),
    [],
  );

  const editPrime = useCallback<CaseContextValue["editPrime"]>((edit) => {
    setState((s) => {
      const d = deriveCase(s);
      const baseParts = s.primeAuto ? { ...d.primeParts } : s.primeParts;
      const baseTubing = s.primeAuto ? d.primeTubing.map((t) => ({ ...t })) : s.primeTubing;
      const out = edit(baseParts, baseTubing);
      return {
        ...s,
        primeAuto: false,
        primePresetId: d.preset.id,
        primeParts: out.parts ?? baseParts,
        primeTubing: out.tubing ?? baseTubing,
      };
    });
  }, []);

  const loadPreset = useCallback((id: CircuitPresetId) => {
    const preset = CIRCUIT_PRESETS.find((p) => p.id === id)!;
    setState((s) => ({
      ...s,
      primeAuto: false,
      primePresetId: id,
      primeParts: { ...preset.parts },
      primeTubing: preset.tubing.map((t) => ({ ...t })),
      primeOverride: null,
    }));
  }, []);

  const loadExample = useCallback((group: Group) => {
    const ex = group === "paed" ? { ...DEFAULT_CASE, ...PAED_EXAMPLE } : DEFAULT_CASE;
    // Only the patient changes; saved circuit and protocol settings stay.
    setState((s) => ({
      ...s,
      example: true,
      group: ex.group,
      weight: ex.weight,
      height: ex.height,
      age: ex.age,
      ageUnit: ex.ageUnit,
      sex: ex.sex,
      hct: ex.hct,
      ...PER_CASE_RESET,
    }));
  }, []);

  const clearPatient = useCallback(() => {
    setState((s) => ({ ...s, example: false, weight: null, height: null, age: null, hct: null, ...PER_CASE_RESET }));
  }, []);

  const resetAll = useCallback(() => setState({ ...DEFAULT_CASE }), []);

  const derived = useMemo(() => deriveCase(state), [state]);

  const value = useMemo(
    () => ({ state, derived, set, setPatient, setGroup, editPrime, loadPreset, loadExample, clearPatient, resetAll, theme, toggleTheme }),
    [state, derived, set, setPatient, setGroup, editPrime, loadPreset, loadExample, clearPatient, resetAll, theme, toggleTheme],
  );

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCase(): CaseContextValue {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error("useCase must be used inside <CaseProvider>");
  return ctx;
}
