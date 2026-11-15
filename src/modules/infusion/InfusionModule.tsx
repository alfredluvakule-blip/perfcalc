import { useState } from "react";
import { Segmented, Note } from "@/components/calculators/shared";
import InfusionCalculator from "./InfusionCalculator";
import SyringePrep from "./SyringePrep";

export default function InfusionModule() {
  const [tab, setTab] = useState<"infusion" | "prep" | "tci">("infusion");
  return (
    <div className="space-y-4">
      <Segmented
        label="Tool"
        value={tab}
        onChange={setTab}
        options={[
          { value: "infusion", label: "Infusion rate" },
          { value: "prep", label: "Syringe preparation" },
          { value: "tci", label: "TCI" },
        ]}
      />
      {/* Both stay mounted so typed values survive switching. */}
      <div hidden={tab !== "infusion"}>
        <InfusionCalculator />
      </div>
      <div hidden={tab !== "prep"}>
        <SyringePrep />
      </div>
      {tab === "tci" ? (
        <Note tone="warn">
          Target-controlled infusion (Marsh, Schnider, Minto and Eleveld models) is planned for phase 4. It will only be released after its output has been checked against published reference simulations and
          approved by your clinicians. Use fixed-rate mode, or a TCI pump with its own built-in models, until then.
        </Note>
      ) : null}
    </div>
  );
}
