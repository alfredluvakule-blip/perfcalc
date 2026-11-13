import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Droplets, Pill, Beaker, BookOpen, Heart, Zap, Stethoscope, Wrench, GitBranch, ClipboardList, Moon, Sun } from "lucide-react";
import { CaseProvider, useCase } from "@/context/CaseContext";
import FlowCalculator from "@/components/calculators/FlowCalculator";
import HematocritCalculator from "@/components/calculators/HematocritCalculator";
import DrugDosageCalculator from "@/components/calculators/DrugDosageCalculator";
import PrimeCalculator from "@/components/calculators/PrimeCalculator";
import QuickReference from "@/components/calculators/QuickReference";
import ElectrolyteCorrection from "@/components/calculators/ElectrolyteCorrection";
import AnesthesiaDoses from "@/components/calculators/AnesthesiaDoses";
import CaseSheet from "@/components/calculators/CaseSheet";
import { PatientEditor, PatientSummary } from "@/components/calculators/PatientBar";
import { EquipmentCalculation, CpbTechniques } from "@/components/calculators/ReferenceTables";
import { InstallButton, UpdateBanner } from "@/components/AppInstall";
import perfTeam1 from "@/assets/perfusion-team-1.jpg";
import perfTeam2 from "@/assets/perfusion-team-2.jpg";
import perfTeam3 from "@/assets/perfusion-team-3.png";
import perfBg from "@/assets/perfusion-bg.png";

const teamPhotos = [
  { src: perfTeam1, alt: "Perfusionists preparing CPB circuit with IV lines" },
  { src: perfTeam2, alt: "Perfusionist operating the heart-lung machine" },
  { src: perfTeam3, alt: "Perfusionist monitoring CPB equipment during surgery" },
].filter((photo) => Boolean(photo.src));

const tabs = [
  { value: "flow", label: "Flow & BSA", icon: Activity, content: <FlowCalculator /> },
  { value: "hematocrit", label: "Hemodilution", icon: Droplets, content: <HematocritCalculator /> },
  { value: "drugs", label: "Drug Dosages", icon: Pill, content: <DrugDosageCalculator /> },
  { value: "prime", label: "Prime Volume", icon: Beaker, content: <PrimeCalculator /> },
  { value: "reference", label: "Quick Reference", icon: BookOpen, content: <QuickReference /> },
  { value: "electrolytes", label: "Electrolytes", icon: Zap, content: <ElectrolyteCorrection /> },
  { value: "anesthesia", label: "Anesthesia", icon: Stethoscope, content: <AnesthesiaDoses /> },
  { value: "equipment", label: "Equipment Calculation", icon: Wrench, content: <EquipmentCalculation /> },
  { value: "cpb", label: "CPB Techniques", icon: GitBranch, content: <CpbTechniques /> },
  { value: "sheet", label: "Case Sheet", icon: ClipboardList, content: <CaseSheet /> },
];

const TAB_KEY = "perfcalc-tz-tab";

function readTab(): string {
  const hash = window.location.hash.slice(1);
  if (hash && tabs.some((t) => t.value === hash)) return hash;
  try {
    const saved = window.localStorage.getItem(TAB_KEY);
    if (saved && tabs.some((t) => t.value === saved)) return saved;
  } catch {
    /* ignore */
  }
  return "flow";
}

const Calculator = () => {
  const { state, theme, toggleTheme, resetAll } = useCase();
  const [tab, setTab] = useState(readTab);
  const [patientOpen, setPatientOpen] = useState(state.example);
  const stripRef = useRef<HTMLDivElement>(null);

  // App shortcuts and links such as #sheet or #drugs open that tab.
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (tabs.some((t) => t.value === hash)) setTab(hash);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Keep the selected tab visible in the scrolling strip on a phone.
  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>('[data-state="active"]');
    if (strip && active) {
      strip.scrollTo({ left: active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2, behavior: "smooth" });
    }
    try {
      window.localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden border-b bg-[#0d2740] print:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {perfBg ? (
          <>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${perfBg})` }} />
            <div className="absolute inset-0 bg-[#0d2740]/80" />
          </>
        ) : null}
        <div className="container relative z-10 mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d62839] shadow-lg">
              <Heart className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-white">PerfCalc TZ</h1>
              <p className="hidden truncate text-xs text-white/75 min-[420px]:block sm:text-sm">CPB Calculator & Reference — Cardiovascular Perfusion · Tanzania</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <InstallButton />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-white/25 px-3 text-xs font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-5xl px-4 pb-6 print:max-w-none print:p-0">
        <Tabs value={tab} onValueChange={setTab}>
          {/* Patient summary and tab strip stay in reach while scrolling */}
          <div className="sticky top-0 z-20 -mx-4 space-y-2 border-b bg-background/95 px-4 py-2 backdrop-blur print:hidden">
            <PatientSummary open={patientOpen} onToggle={() => setPatientOpen((o) => !o)} />
            <TabsList ref={stripRef} className="flex h-auto w-full justify-start gap-1 overflow-x-auto border bg-card p-1.5 no-scrollbar md:flex-wrap">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {patientOpen ? <PatientEditor className="mt-4 print:hidden" /> : null}

          {/* Every tab stays mounted so typed values and ticked checklists survive switching tabs.
              When printing, only the case sheet is shown, whichever tab is open. */}
          {tabs.map(({ value, content }) => (
            <TabsContent
              key={value}
              value={value}
              forceMount
              className={value === "sheet" ? "mt-4 data-[state=inactive]:hidden print:mt-0 print:!block" : "mt-4 data-[state=inactive]:hidden print:hidden"}
            >
              {content}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Team Gallery */}
      {teamPhotos.length > 0 ? (
        <section className="border-t bg-card print:hidden">
          <div className="container mx-auto max-w-5xl px-4 py-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Our Perfusion Team in Action</p>
            <div className="grid grid-cols-3 gap-3">
              {teamPhotos.map((photo, i) => (
                <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg shadow-md">
                  <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <UpdateBanner />

      {/* Footer */}
      <footer className="mt-8 border-t print:hidden">
        <div className="container mx-auto max-w-5xl space-y-2 px-4 py-4 text-center">
          <p className="text-[11px] text-muted-foreground">
            PerfCalc TZ — For clinical reference only. Always verify calculations and apply clinical judgment. Not a substitute for professional training.
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="rounded text-[11px] font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Reset all saved settings to defaults
          </button>
        </div>
      </footer>
    </div>
  );
};

const Index = () => (
  <CaseProvider>
    <Calculator />
  </CaseProvider>
);

export default Index;
