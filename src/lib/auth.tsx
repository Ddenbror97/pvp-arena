import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

interface AuthState {
  ready: boolean;
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  needsProfile: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  // Serialise loads: initial getSession and SIGNED_IN can fire together on first
  // sign-in, and two concurrent ensure_profile calls race (the loser hits a unique
  // violation and would wrongly show the "pick your username" dialog).
  const chain = useRef<Promise<void>>(Promise.resolve());

  const doLoad = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setNeedsProfile(false);
      return;
    }
    const fetchProfile = async () =>
      (
        await supabase
          .from("profiles")
          .select("id, username, avatar_url, created_at")
          .eq("id", s.user.id)
          .maybeSingle()
      ).data;
    let p = await fetchProfile();
    if (!p) {
      // First sign-in: create the profile from signup details if we have them.
      const meta = s.user.user_metadata as { username?: string; age_confirmed?: boolean };
      if (meta?.username && meta?.age_confirmed) {
        const { error } = await supabase.rpc("ensure_profile", { p_username: meta.username, p_age_confirmed: true });
        if (error) console.warn("ensure_profile failed", error.message);
        // Re-read regardless of error: a parallel call may have created it.
        p = await fetchProfile();
      }
    }
    setProfile(p ?? null);
    setNeedsProfile(!p);
  }, []);

  const loadProfile = useCallback(
    (s: Session | null) => {
      const next = chain.current.catch(() => {}).then(() => doLoad(s));
      chain.current = next;
      return next;
    },
    [doLoad],
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (active) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(s);
      setTimeout(() => void loadProfile(s), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value: AuthState = {
    ready,
    session,
    userId: session?.user.id ?? null,
    profile,
    needsProfile,
    refreshProfile: () => loadProfile(session),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
