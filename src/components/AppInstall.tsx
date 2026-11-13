import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Monitor, RefreshCw, Smartphone, WifiOff, X } from "lucide-react";

/* Install and update support for the installable (PWA) version.
   Chrome and Edge on Android and Windows fire `beforeinstallprompt`, so the
   button opens the browser's own install dialog. iPhone Safari and other
   browsers have no such event, so the button shows short instructions. */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [help, setHelp] = useState(false);
  // Inside a preview frame installing is impossible, so the button is hidden there.
  const framed = window.self !== window.top;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || framed) return null;

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else {
      setHelp(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-semibold text-[#0d2740] shadow-sm hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d2740]"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Install app
      </button>
      {/* Rendered on <body> so the sticky header cannot sit on top of it. */}
      {help ? createPortal(<InstallHelp onClose={() => setHelp(false)} ios={isIOS()} />, document.body) : null}
    </>
  );
}

function InstallHelp({ onClose, ios }: { onClose: () => void; ios: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps: { icon: typeof Smartphone; title: string; lines: string[]; first: boolean }[] = [
    {
      icon: Smartphone,
      title: "iPhone or iPad",
      first: ios,
      lines: ["Open this page in Safari.", "Tap the Share button (square with an arrow).", "Choose Add to Home Screen, then Add."],
    },
    {
      icon: Smartphone,
      title: "Android",
      first: !ios,
      lines: ["Open this page in Chrome.", "Tap the ⋮ menu.", "Choose Install app (or Add to Home screen)."],
    },
    {
      icon: Monitor,
      title: "Windows or Mac computer",
      first: false,
      lines: ["Open this page in Microsoft Edge or Google Chrome.", "Click the install icon at the right of the address bar, or open the menu and choose Apps › Install PerfCalc TZ.", "It then opens from the Start menu or desktop like any program."],
    },
  ];
  steps.sort((a, b) => Number(b.first) - Number(a.first));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-xl border bg-card p-5 text-card-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="install-title" className="text-base font-semibold">
              Install PerfCalc TZ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Once installed it opens from your home screen or Start menu and works with no internet.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {steps.map(({ icon: Icon, title, lines, first }) => (
            <section key={title} className={first ? "rounded-lg border border-primary/40 bg-accent/50 p-3" : "rounded-lg border p-3"}>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                {title}
              </h3>
              <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-sm">
                {lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Tells the user when the app is ready offline, and when a new version is waiting. */
export function UpdateBanner() {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [update, setUpdate] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
    let cancelled = false;
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (cancelled) return;
        const updateSW = registerSW({
          onOfflineReady: () => setOfflineReady(true),
          onNeedRefresh: () => setNeedRefresh(true),
        });
        setUpdate(() => updateSW);
      })
      .catch(() => {
        /* service worker unavailable: the app still works online */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!offlineReady) return;
    const t = window.setTimeout(() => setOfflineReady(false), 6000);
    return () => window.clearTimeout(t);
  }, [offlineReady]);

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 print:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div role="status" className="flex w-full max-w-md items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg">
        {needRefresh ? <RefreshCw className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : <WifiOff className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
        <span className="flex-1">{needRefresh ? "A new version of PerfCalc TZ is ready." : "Ready to work offline."}</span>
        {needRefresh ? (
          <>
            <button type="button" onClick={() => setNeedRefresh(false)} className="rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              Later
            </button>
            <button type="button" onClick={() => update?.(true)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
              Update now
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setOfflineReady(false)} aria-label="Dismiss" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
