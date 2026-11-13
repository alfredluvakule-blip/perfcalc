import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";
import fs from "fs";

// Team photos are optional: drop perfusion-team-1.jpg, perfusion-team-2.jpg,
// perfusion-team-3.png and perfusion-bg.png into src/assets and they appear.
// Until then each missing photo resolves to "" and the gallery is hidden.
// The one-file build has no service worker, so its update check is a no-op.
function pwaStub(): Plugin {
  return {
    name: "pwa-register-stub",
    resolveId: (id) => (id === "virtual:pwa-register" ? "\0pwa-register-stub" : null),
    load: (id) => (id === "\0pwa-register-stub" ? "export function registerSW() { return async () => {}; }" : null),
  };
}

function optionalAssets(): Plugin {
  return {
    name: "optional-assets",
    enforce: "pre",
    resolveId(id) {
      const assets = path.resolve(__dirname, "src/assets") + path.sep;
      const file = id.startsWith("@/assets/") ? path.resolve(__dirname, "src", id.slice(2)) : id;
      if (file.startsWith(assets) && !fs.existsSync(file.split("?")[0])) return "\0missing-asset:" + file;
      return null;
    },
    load(id) {
      if (id.startsWith("\0missing-asset:")) return 'export default "";';
      return null;
    },
  };
}

// SINGLE=1 builds one self-contained HTML file for sharing without a server.
const single = process.env.SINGLE === "1";
// GitHub Pages serves the app from /perfcalc/; the deploy workflow sets BASE_PATH.
const base = single ? "./" : process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [
    optionalAssets(),
    react(),
    single
      ? [pwaStub(), viteSingleFile()]
      : VitePWA({
          registerType: "prompt",
          injectRegister: false,
          includeAssets: ["icons/favicon-32.png", "icons/icon.svg", "icons/apple-touch-icon.png"],
          manifest: {
            id: base,
            name: "PerfCalc TZ — CPB Calculator",
            short_name: "PerfCalc TZ",
            description: "Cardiopulmonary bypass calculator and reference for perfusionists: flow, haemodilution, prime, drugs, equipment and a printable case sheet. Works offline.",
            lang: "en",
            start_url: base,
            scope: base,
            display: "standalone",
            orientation: "any",
            background_color: "#f4f7f9",
            theme_color: "#0d2740",
            categories: ["medical", "health", "utilities"],
            icons: [
              { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
              { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
              { src: "icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
              { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
            shortcuts: [
              { name: "Case sheet", short_name: "Case sheet", url: `${base}#sheet`, icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
              { name: "Drug dosages", short_name: "Drugs", url: `${base}#drugs`, icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
            ],
          },
          workbox: {
            // Everything the app needs is precached, so it opens with no signal in theatre.
            globPatterns: ["**/*.{js,css,html,png,svg,woff2,jpg}"],
            globIgnores: ["**/Perfusion Tanzania.dc.html", "**/support.js"],
            navigateFallback: `${base}index.html`,
            navigateFallbackDenylist: [/\.dc\.html$/],
            cleanupOutdatedCaches: true,
          },
        }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: single ? { target: "es2019", cssCodeSplit: false, assetsInlineLimit: 100000000 } : { target: "es2019" },
});
