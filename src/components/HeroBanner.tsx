import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { teamPhotos } from "@/lib/photos";
import { cn } from "@/lib/utils";

/* Animated banner: the team photos cross-fade with a slow zoom, the pump's
   lamps glow, arterial and venous lines flow toward the picture, and the
   headline cycles through what the app works out. All motion is CSS (see
   "Banner motion" in index.css) and stops for people who ask for reduced
   motion. Nothing here is clinical data. */

const WORDS = ["pump flow", "haemodilution", "prime volume", "heparin and protamine", "cardioplegia", "cannula sizes"];
const SLIDE_MS = 6500;
const WORD_MS = 2400;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/** A heartbeat trace that draws itself, used as a small "live" mark. */
function PulseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 20" className={className} aria-hidden="true" fill="none">
      <path d="M0 10h18l3-6 4 13 4-17 4 14 3-4h28" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
      <path className="pc-ecg" pathLength={100} d="M0 10h18l3-6 4 13 4-17 4 14 3-4h28" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Headline({ word, className }: { word: string; className?: string }) {
  return (
    <p className={cn("font-semibold leading-tight text-white", className)}>
      Work out{" "}
      <span className="block overflow-hidden pb-0.5 text-sky-300">
        <span key={word} className="pc-word block">
          {word}
        </span>
      </span>
      beside the pump.
    </p>
  );
}

const HeroBanner = ({ onHide }: { onHide: () => void }) => {
  const reduced = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const [word, setWord] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused || teamPhotos.length < 2) return;
    const t = window.setTimeout(() => setSlide((s) => (s + 1) % teamPhotos.length), SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [slide, reduced, paused]);

  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => setWord((w) => (w + 1) % WORDS.length), WORD_MS);
    return () => window.clearInterval(t);
  }, [reduced]);

  const current = teamPhotos[slide];

  return (
    <div className="pc-hero relative">
      {/* Arterial (red) and venous (blue) lines running into the picture. Wide screens only. */}
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true" fill="none">
        <path d="M-20 262H360C470 262 470 150 600 150" stroke="#ef4444" strokeOpacity="0.28" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path className="pc-flow" d="M-20 262H360C470 262 470 150 600 150" stroke="#f87171" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 26" vectorEffect="non-scaling-stroke" />
        <path d="M-20 282H390C500 282 490 195 600 195" stroke="#3b82f6" strokeOpacity="0.28" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path className="pc-flow pc-flow-back" d="M-20 282H390C500 282 490 195 600 195" stroke="#60a5fa" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 26" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="container relative mx-auto grid max-w-5xl items-center gap-6 px-4 pb-5 pt-1 md:grid-cols-[1fr_minmax(0,25rem)] md:pb-7">
        {/* Words: beside the picture on wide screens */}
        <div className="hidden md:block">
          <p className="pc-rise flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
            <PulseMark className="h-4 w-12 text-red-400" />
            CPB calculator &amp; reference
          </p>
          <div className="pc-rise pc-delay-1 mt-3">
            <Headline word={WORDS[word]} className="text-3xl lg:text-4xl" />
          </div>
          <p className="pc-rise pc-delay-2 mt-3 max-w-md text-sm text-white/75">Enter the patient once. Adult and paediatric. Works offline in theatre.</p>
        </div>

        {/* Picture */}
        <figure
          className="pc-frame relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/40 shadow-2xl ring-1 ring-white/15"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {teamPhotos.map((photo, i) => (
            <div key={photo.src} className={cn("absolute inset-0 transition-opacity duration-1000", i === slide ? "opacity-100" : "opacity-0")} aria-hidden={i !== slide}>
              <div className={cn("absolute inset-0", i % 2 === 0 ? "pc-kenburns-a" : "pc-kenburns-b")} style={{ transformOrigin: photo.position }}>
                <img src={photo.src} alt={i === slide ? photo.alt : ""} className="h-full w-full object-cover" style={{ objectPosition: photo.position }} loading={i === 0 ? "eager" : "lazy"} />
                {photo.glows?.map((g, n) => (
                  <span
                    key={n}
                    className="pc-glow absolute rounded-full mix-blend-screen"
                    style={{
                      left: `${g.x}%`,
                      top: `${g.y}%`,
                      width: `${g.size}%`,
                      aspectRatio: "1",
                      marginLeft: `-${g.size / 2}%`,
                      marginTop: `-${g.size / 2}%`,
                      background: `radial-gradient(circle, ${g.color} 0%, ${g.color}55 35%, transparent 70%)`,
                      animationDelay: `${g.delay}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Shade only the lower part, where the words and markers sit */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#061423]/90 to-transparent md:h-1/3 md:from-[#061423]/75" />

          {/* Words: over the picture on a phone */}
          <div className="absolute inset-x-0 bottom-0 p-4 md:hidden">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
              <PulseMark className="h-3.5 w-10 text-red-400" />
              CPB calculator &amp; reference
            </p>
            <Headline word={WORDS[word]} className="mt-1 text-xl" />
          </div>

          <figcaption key={current.caption} className="pc-rise absolute bottom-3 left-4 hidden text-xs font-medium text-white/90 md:block">
            {current.caption}
          </figcaption>

          {/* Slide markers: the current one fills as its time runs */}
          <div className="absolute left-4 top-3 flex gap-1.5 md:bottom-3 md:left-auto md:right-4 md:top-auto">
            {teamPhotos.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => setSlide(i)}
                aria-label={`Show photo ${i + 1} of ${teamPhotos.length}: ${photo.caption}`}
                aria-current={i === slide}
                className="group flex h-6 items-center focus-visible:outline-none"
              >
                <span className="relative block h-1 w-7 overflow-hidden rounded-full bg-white/30 group-focus-visible:ring-2 group-focus-visible:ring-white">
                  <span
                    key={i === slide ? `on-${slide}` : "off"}
                    className={cn("absolute inset-0 origin-left rounded-full bg-white", i === slide ? (reduced || paused ? "" : "pc-progress") : "scale-x-0")}
                    style={i === slide ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
                  />
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onHide}
            className="absolute right-3 top-2.5 flex h-7 items-center gap-1 rounded-full bg-black/45 px-2.5 text-[11px] font-medium text-white backdrop-blur hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            Hide banner
          </button>
        </figure>
      </div>
    </div>
  );
};

export default HeroBanner;
