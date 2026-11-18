/**
 * Optional server connection (Supabase). The app works fully without it:
 * every calculator, score, chart and record stays on the device. Signing in
 * adds staff roles and copies the audit log to the hospital's server log.
 *
 * The publishable key is meant for browsers; access is enforced by row level
 * security in supabase/migrations.
 */
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { Role } from "./modules";

const URL = import.meta.env.VITE_SUPABASE_URL ?? "https://jerlumwcygjdfgmmbdzy.supabase.co";
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_wECnN9b_y7PWd1_2zyXRPA_6gj_tUeD";

let client: SupabaseClient | null = null;
export function backend(): SupabaseClient {
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "nap-auth" } });
  return client;
}

export interface StaffProfile {
  id: string;
  full_name: string;
  role: Role;
  approved: boolean;
  hospital_id: string | null;
  hospital_name: string | null;
}

export function useSession(): { session: Session | null; ready: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sb = backend();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

export async function loadProfile(userId: string): Promise<StaffProfile | null> {
  const sb = backend();
  const { data, error } = await sb.from("nap_profiles").select("id, full_name, role, approved, hospital_id").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  let hospital_name: string | null = null;
  if (data.hospital_id && data.approved) {
    const h = await sb.from("nap_hospitals").select("name").eq("id", data.hospital_id).maybeSingle();
    hospital_name = h.data?.name ?? null;
  }
  return { ...(data as Omit<StaffProfile, "hospital_name">), hospital_name };
}
