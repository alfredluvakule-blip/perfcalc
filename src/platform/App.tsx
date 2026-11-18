import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Languages, LayoutGrid, Moon, Search, ShieldAlert, Sun } from "lucide-react";
import Index from "@/pages/Index";
import { InstallButton, UpdateBanner } from "@/components/AppInstall";
import InfusionModule from "@/modules/infusion/InfusionModule";
import FormularyEditor from "@/modules/infusion/FormularyEditor";
import FluidsModule from "@/modules/fluids/FluidsModule";
import AuditLog from "@/modules/AuditLog";
import ScoresModule from "@/modules/scores/ScoresModule";
import ChecklistsModule from "@/modules/checklists/ChecklistsModule";
import AnaesthesiaModule from "@/modules/anaesthesia/AnaesthesiaModule";
import IcuModule from "@/modules/icu/IcuModule";
import PressureModule from "@/modules/pressure/PressureModule";
import NursingModule from "@/modules/nursing/NursingModule";
import AccountModule from "@/modules/account/AccountModule";
import { AccountProvider } from "./account";
import { cn } from "@/lib/utils";
import { I18nProvider, useI18n } from "./i18n";
import { MODULES, findModule, type ModuleDef } from "./modules";
import { useRoute } from "./router";
import { useTheme } from "./theme";

const VIEWS: Record<string, () => ReactNode> = {
  infusion: () => <InfusionModule />,
  fluids: () => <FluidsModule />,
  formulary: () => <FormularyEditor />,
  audit: () => <AuditLog />,
  scores: () => <ScoresModule key={window.location.hash} initial={window.location.hash.split("/")[2]} />,
  checklists: () => <ChecklistsModule />,
  anaesthesia: () => <AnaesthesiaModule />,
  icu: () => <IcuModule />,
  pressure: () => <PressureModule />,
  nursing: () => <NursingModule />,
  account: () => <AccountModule />,
};

function StatusPill({ m }: { m: ModuleDef }) {
  const { t } = useI18n();
  const label = m.status === "ready" ? t("ready") : m.status === "partial" ? t("partial") : t("planned");
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        m.status === "ready" && "border-emerald-400 text-emerald-700 dark:text-emerald-400",
        m.status === "partial" && "border-primary/50 text-primary",
        m.status === "planned" && "border-border text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function Dashboard({ go }: { go: (r: string) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return MODULES;
    return MODULES.filter((m) => `${t(m.title)} ${t(m.description)} ${m.keywords}`.toLowerCase().includes(s));
  }, [q, t]);
  const order = { ready: 0, partial: 1, planned: 2 } as const;
  const sorted = [...list].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div className="space-y-5">
      <div className="min-[460px]:hidden">
        <h1 className="text-xl font-bold tracking-tight">{t("appName")}</h1>
        <p className="text-sm text-muted-foreground">{t("tagline")}</p>
      </div>
      <label className="flex h-12 items-center gap-2 rounded-lg border border-input bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{t("search")}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-full w-full bg-transparent text-base outline-none" type="search" />
      </label>
      {sorted.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => go(m.id)}
                className={cn(
                  "group flex min-h-[8.5rem] flex-col gap-2 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  m.status === "planned" && "opacity-80",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <StatusPill m={m} />
                </div>
                <div className="font-semibold leading-tight">
                  {m.letter ? <span className="mr-1.5 text-xs font-bold text-muted-foreground">{m.letter}</span> : null}
                  {t(m.title)}
                </div>
                <p className="text-sm leading-snug text-muted-foreground">{t(m.description)}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noMatch")}</p>
      )}
    </div>
  );
}

function Planned({ m }: { m: ModuleDef }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 rounded-lg border bg-card p-5">
      <p className="text-sm">{t(m.description)}</p>
      <p className="text-sm font-medium">
        {t("plannedPhase")} {m.phase}.
      </p>
      <p className="text-sm text-muted-foreground">{t("plannedNote")}</p>
    </div>
  );
}

function Shell() {
  const { t, toggleLang } = useI18n();
  const [theme, toggleTheme] = useTheme();
  const [route, go] = useRoute();

  // The original PerfCalc TZ app keeps its own header, tabs and case sheet.
  if (route === "perfusion") return <Index onHome={() => go("home")} />;

  const mod = route === "home" ? undefined : findModule(route);
  const view = mod ? VIEWS[mod.id] : undefined;
  const headerBtn =
    "flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-white/25 px-3 text-xs font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-[#0d2740] print:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={() => go("home")} className="flex min-w-0 items-center gap-3 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d62839] shadow-lg">
              <LayoutGrid className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <span className="min-w-0 max-[459px]:sr-only">
              <span className="block truncate text-base font-bold leading-tight text-white sm:text-lg">{t("appName")}</span>
              <span className="hidden truncate text-xs text-white/75 sm:block">{t("tagline")}</span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <InstallButton />
            <button type="button" onClick={toggleLang} className={headerBtn} aria-label="Change language / Badilisha lugha">
              <Languages className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t("language")}</span>
              <span className="sm:hidden">{t("language") === "English" ? "EN" : "SW"}</span>
            </button>
            <button type="button" onClick={toggleTheme} className={headerBtn} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
              {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{theme === "dark" ? t("light") : t("dark")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 print:hidden">
        <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2 text-xs">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t("draftBanner")}
        </p>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {mod ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
            <button type="button" onClick={() => go("home")} className="flex h-10 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium hover:bg-muted">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("back")}
            </button>
            <h1 className="text-xl font-bold tracking-tight">
              {mod.letter ? <span className="mr-2 text-muted-foreground">{mod.letter}</span> : null}
              {t(mod.title)}
            </h1>
            <StatusPill m={mod} />
          </div>
        ) : null}
        {mod ? view ? view() : <Planned m={mod} /> : <Dashboard go={go} />}
      </main>

      <UpdateBanner />

      <footer className="border-t print:hidden">
        <p className="mx-auto max-w-6xl px-4 py-4 text-center text-[11px] text-muted-foreground">{t("disclaimer")}</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AccountProvider>
        <Shell />
      </AccountProvider>
    </I18nProvider>
  );
}
