import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { SYNC_FLAG, type AuditEvent } from "@/lib/clinical/audit";
import { flush, localOutbox, toServerRow, type SendResult } from "@/lib/clinical/auditSync";
import { backend, type StaffProfile } from "./backend";

/* Sends queued audit events whenever the user is signed in and approved:
   on sign-in, after each new event, and when the connection comes back. */
export default function SyncAgent({ session, profile }: { session: Session | null; profile: StaffProfile | null }) {
  const hospital = session && profile?.approved ? profile.hospital_id : null;
  useEffect(() => {
    try {
      if (hospital) window.localStorage.setItem(SYNC_FLAG, "1");
      else window.localStorage.removeItem(SYNC_FLAG);
    } catch {
      /* storage blocked */
    }
    if (!hospital) return;
    let busy = false;
    const send = async (e: AuditEvent): Promise<SendResult> => {
      if (!navigator.onLine) return "retry";
      const { error } = await backend().from("nap_audit_events").insert(toServerRow(e, hospital));
      if (!error) return "sent";
      if (error.code === "23505") return "duplicate";
      if (error.code === "42501" || error.code?.startsWith("23")) return "rejected";
      return "retry";
    };
    const run = async () => {
      if (busy) return;
      busy = true;
      try {
        await flush(localOutbox, send);
      } finally {
        busy = false;
      }
    };
    run();
    window.addEventListener("nap-audit", run);
    window.addEventListener("online", run);
    return () => {
      window.removeEventListener("nap-audit", run);
      window.removeEventListener("online", run);
    };
  }, [hospital]);
  return null;
}
