import team1 from "@/assets/perfusion-team-1.jpg";
import team2 from "@/assets/perfusion-team-2.jpg";
import team3 from "@/assets/perfusion-team-3.jpg";

export interface Glow {
  /** Position inside the 4:3 banner frame, in percent. */
  x: number;
  y: number;
  /** Diameter as a percentage of the frame width. */
  size: number;
  color: string;
  delay: number;
}

export interface TeamPhoto {
  src: string;
  alt: string;
  caption: string;
  /** Which part of the photo stays in view when it is cropped to 4:3. */
  position: string;
  /** Soft lights laid over the pump's own indicator lamps (banner only). */
  glows?: Glow[];
}

/** The perfusion team photos, used by the animated banner and the gallery. */
export const teamPhotos: TeamPhoto[] = [
  {
    src: team1,
    alt: "Perfusionist in theatre writing on the perfusion chart beside a heart-lung machine",
    caption: "Charting beside the pump",
    position: "50% 70%",
    glows: [
      { x: 62.5, y: 18.5, size: 13, color: "#ff5c8a", delay: 0 },
      { x: 77.5, y: 19, size: 13, color: "#4ade80", delay: 0.9 },
      { x: 75, y: 60.5, size: 12, color: "#60a5fa", delay: 0.4 },
      { x: 59, y: 59.5, size: 11, color: "#ff5c8a", delay: 1.3 },
      { x: 73.5, y: 85, size: 16, color: "#fbbf24", delay: 0.7 },
    ],
  },
  {
    src: team2,
    alt: "Two theatre staff arranging fluid bags and lines on a stand",
    caption: "Preparing fluids and lines",
    position: "45% 50%",
  },
  {
    src: team3,
    alt: "Perfusionist checking tubing at the oxygenator and reservoir",
    caption: "Checking the circuit",
    position: "50% 0%",
  },
];
