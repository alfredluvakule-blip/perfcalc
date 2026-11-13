import { createRoot } from "react-dom/client";
// Fonts ship with the app so it looks the same offline.
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import Index from "./pages/Index";
import "./index.css";

createRoot(document.getElementById("root")!).render(<Index />);
