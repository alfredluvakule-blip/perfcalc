import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { loadProfile, useSession, type StaffProfile } from "./backend";
import SyncAgent from "./SyncAgent";

interface AccountState {
  session: Session | null;
  profile: StaffProfile | null;
  ready: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AccountState>({ session: null, profile: null, ready: false, refresh: async () => {} });

export function AccountProvider({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const uid = session?.user.id ?? null;
  const refresh = useCallback(async () => {
    setProfile(uid ? await loadProfile(uid) : null);
  }, [uid]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return (
    <Ctx.Provider value={{ session, profile, ready, refresh }}>
      <SyncAgent session={session} profile={profile} />
      {children}
    </Ctx.Provider>
  );
}

export const useAccount = () => useContext(Ctx);
