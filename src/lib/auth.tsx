import { writeAuthHint } from "@/lib/auth-hint";
import { claimRememberedPromo, peekPromoCode } from "@/lib/promo/claim";
import { recordGameSignupEventFn } from "@/lib/promo/game-signup.functions";
import {
  accountCreatedRecently,
  browserStore,
  clearInviteOrigin,
  promoClaimAnalyticsEvent,
  readInviteOrigin,
} from "@/lib/promo/game-signup-policy";
import { claimPartnerAttribution } from "@/lib/partner/acquire.functions";
import { claimReferral } from "@/lib/referral/referral.functions";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

// Last loaded public profile, so a hard load shows the name and avatar before the
// profiles request returns. Display only; the fresh row always replaces it.
const PROFILE_KEY = "pvp_profile";

function readCachedProfile(userId: string): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as Profile | null;
    return p?.id === userId && typeof p.username === "string" && typeof p.created_at === "string"
      ? p
      : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(p: Profile | null) {
  try {
    if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Storage can be unavailable (private mode); the cache is optional.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  // Serialise loads: initial getSession and SIGNED_IN can fire together on first
  // sign-in, and two concurrent ensure_profile calls race (the loser hits a unique
  // violation and would wrongly show the "pick your username" dialog).
  const chain = useRef<Promise<void>>(Promise.resolve());
  const lastUser = useRef<string | null>(null);
  const claimed = useRef<string | null>(null);
  const partnerClaimed = useRef<string | null>(null);
  const promoClaimed = useRef<string | null>(null);
  const signupNoted = useRef(false);
  const claim = useServerFn(claimReferral);
  const claimPartner = useServerFn(claimPartnerAttribution);
  const recordSignupEvent = useServerFn(recordGameSignupEventFn);
  const queryClient = useQueryClient();

  const doLoad = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setNeedsProfile(false);
      writeCachedProfile(null);
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
        const { error } = await supabase.rpc("ensure_profile", {
          p_username: meta.username,
          p_age_confirmed: true,
        });
        if (error) console.warn("ensure_profile failed", error.message);
        // Re-read regardless of error: a parallel call may have created it.
        p = await fetchProfile();
      }
    }
    // Drop results for a user who is no longer the signed-in one.
    if (lastUser.current !== s.user.id) return;
    setProfile(p ?? null);
    setNeedsProfile(!p);
    writeCachedProfile(p ?? null);
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
      lastUser.current = data.session?.user.id ?? null;
      setSession(data.session);
      writeAuthHint(!!data.session);
      const cached = data.session ? readCachedProfile(data.session.user.id) : null;
      if (cached) setProfile(cached);
      await loadProfile(data.session);
      if (active) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // All tabs in one browser share one sign-in. If another tab signs into a
      // different account, the session here switches user (possibly via a
      // TOKEN_REFRESHED event) — never keep showing the previous user's profile.
      const nextUser = s?.user.id ?? null;
      const userChanged = nextUser !== lastUser.current;
      lastUser.current = nextUser;
      if (
        !userChanged &&
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED"
      ) {
        setSession(s);
        return;
      }
      if (userChanged) {
        setProfile(null);
        setNeedsProfile(false);
      }
      setSession(s);
      writeAuthHint(!!s);
      setTimeout(() => void loadProfile(s), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (!profile) return;
    if (claimed.current === profile.id) return;
    claimed.current = profile.id;
    void claim().catch(() => {
      claimed.current = null;
    });
  }, [profile, claim]);

  useEffect(() => {
    if (!profile) return;
    if (partnerClaimed.current === profile.id) return;
    partnerClaimed.current = profile.id;
    void claimPartner().catch(() => {
      partnerClaimed.current = null;
    });
  }, [profile, claimPartner]);

  useEffect(() => {
    if (!session || !profile || signupNoted.current) return;
    const origin = readInviteOrigin(browserStore());
    if (!origin || !accountCreatedRecently(session.user.created_at, Date.now())) return;
    signupNoted.current = true;
    void recordSignupEvent({ data: { event: "promo_signup_completed" } });
  }, [session, profile, recordSignupEvent]);

  useEffect(() => {
    if (!profile || !session || promoClaimed.current === profile.id || !peekPromoCode()) return;
    promoClaimed.current = profile.id;
    const origin = readInviteOrigin(browserStore());
    void claimRememberedPromo({ id: session.user.id, email: session.user.email ?? null }).then(
      (result) => {
        if (result.status === "retry" || result.status === "none") {
          promoClaimed.current = null;
          if (result.status === "none" && origin) clearInviteOrigin(browserStore());
          return;
        }
        void queryClient.invalidateQueries({ queryKey: ["wallet"] });
        const event = origin ? promoClaimAnalyticsEvent(result) : null;
        if (event) void recordSignupEvent({ data: { event } });
        if (origin) clearInviteOrigin(browserStore());
      },
    );
  }, [profile, session, queryClient, recordSignupEvent]);

  const value: AuthState = {
    ready,
    session,
    userId: session?.user.id ?? null,
    profile,
    needsProfile,
    refreshProfile: () => loadProfile(session),
    signOut: async () => {
      // Local scope revokes this device's auth.sessions row (so a stolen access
      // token fails the live-session check) and does not sign out other devices.
      await supabase.auth.signOut({ scope: "local" });
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
