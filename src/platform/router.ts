import { useCallback, useEffect, useState } from "react";

/* Hash routes, so the app works from GitHub Pages, a one-file build and offline.
   #/            dashboard
   #/<module>    a module
   #flow, #sheet, #drugs ... the original PerfCalc TZ tab links, still honoured. */

export const PERFCALC_TABS = ["flow", "hematocrit", "drugs", "prime", "reference", "electrolytes", "anesthesia", "equipment", "cpb", "sheet"];

export function parseRoute(hash: string): string {
  const h = hash.replace(/^#/, "");
  if (PERFCALC_TABS.includes(h)) return "perfusion";
  const m = h.match(/^\/([a-z0-9-]+)/);
  return m ? m[1] : "home";
}

export function useRoute(): [string, (route: string) => void] {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((r: string) => {
    window.location.hash = r === "home" ? "/" : `/${r}`;
    window.scrollTo({ top: 0 });
  }, []);
  return [route, go];
}
