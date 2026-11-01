import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ForgotPassword } from "@/components/auth/ForgotPassword";
import { OtpInput } from "@/components/auth/OtpInput";
import {
  confirmSignupHumanFn,
  resendSignupCodeFn,
  startSignupFn,
  verifySignupCodeFn,
} from "@/lib/auth-otp/signup.functions";
import { TurnstileField } from "@/components/auth/TurnstileField";
import { TURNSTILE_RETRY } from "@/lib/auth-otp/turnstile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  claimOAuthClick,
  DISCORD_PROVIDER,
  discordSignInMessage,
  oauthRedirect,
} from "@/lib/discord-auth";
import { PromoCodeField } from "@/components/promo/PromoCodePanel";
import { peekPromoCode, rememberPromoCode } from "@/lib/promo/claim";
import {
  browserStore,
  clearAuthNext,
  parseAuthSearch,
  readAuthNext,
  readInviteOrigin,
  writeAuthNext,
  type GamePath,
} from "@/lib/promo/game-signup-policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => parseAuthSearch(search),
  head: () => ({
    meta: [
      { title: "Sign in — PVPspinArena" },
      { name: "description", content: "Sign in or create your PVPspinArena account." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Sign in — PVPspinArena" },
      { property: "og:description", content: "Sign in or create your PVPspinArena account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: AuthPage,
});

type Pending = { challengeId: string; email: string; maskedEmail: string };
const PENDING_KEY = "pvp-signup-pending";

function goAfterAuth(navigate: (opts: { to: GamePath }) => void, next: GamePath | null) {
  navigate({ to: next ?? "/" });
}

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#5865F2"
        d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.1.1 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09a.1.1 0 0 0-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02C1.97 9.42 1.22 13.38 1.59 17.3c0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.01.06.02.09.01 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"
      />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(
    search.mode === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [promo, setPromo] = useState(() => (search.code === "PVP1" ? "PVP1" : peekPromoCode()));
  const [age, setAge] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const { userId, ready: authReady } = useAuth();
  const navigate = useNavigate();
  const oauthLock = useRef(false);
  const left = useRef(false);
  const start = useServerFn(startSignupFn);
  const confirmHuman = useServerFn(confirmSignupHumanFn);

  useEffect(() => {
    if (search.next) writeAuthNext(browserStore(), search.next);
  }, [search.next]);

  useEffect(() => {
    if (!userId || left.current) return;
    left.current = true;
    const store = browserStore();
    const next = readAuthNext(store, search.next);
    clearAuthNext(store);
    goAfterAuth(navigate, next);
  }, [userId, navigate, search.next]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code =
      search.get("error_code") ||
      hash.get("error_code") ||
      search.get("error") ||
      hash.get("error");
    const description = search.get("error_description") || hash.get("error_description") || "";
    if (!code && !description) return;
    toast.error(discordSignInMessage(code ?? "", description));
    const url = new URL(window.location.href);
    for (const key of ["error", "error_code", "error_description"]) url.searchParams.delete(key);
    url.hash = "";
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (raw) {
      try {
        setPending(JSON.parse(raw) as Pending);
      } catch {
        sessionStorage.removeItem(PENDING_KEY);
      }
    }
  }, []);

  function savePending(p: Pending | null) {
    setPending(p);
    if (p) sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else sessionStorage.removeItem(PENDING_KEY);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username))
          throw new Error("Usernames are 3–20 letters, numbers or underscores.");
        if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase())
          throw new Error("Those email addresses don't match.");
        if (password !== passwordConfirm) throw new Error("Those passwords don't match.");
        if (!age) throw new Error("You must confirm you are 18 or older.");
        if (!captchaToken) throw new Error(TURNSTILE_RETRY);
        rememberPromoCode(promo, { kind: "email", email: email.trim().toLowerCase() });
        const r = await start({
          data: { email, password, username, ageConfirmed: true, captchaToken },
        });
        if (!r.ok) {
          setCaptchaReset((n) => n + 1);
          throw new Error(r.error);
        }
        savePending({
          challengeId: r.challengeId,
          email: email.trim().toLowerCase(),
          maskedEmail: r.maskedEmail,
        });
      } else {
        if (readInviteOrigin(browserStore()) && promo.trim()) {
          rememberPromoCode(promo, { kind: "email", email: email.trim().toLowerCase() });
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error)
          throw new Error(
            /confirm/i.test(error.message)
              ? "Confirm your email with the code before signing in."
              : "Incorrect email or password.",
          );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function continueWithDiscord() {
    if (!claimOAuthClick(oauthLock)) return;
    const redirectTo = oauthRedirect(window.location.origin, "/auth");
    if (!redirectTo) {
      oauthLock.current = false;
      toast.error(discordSignInMessage("", ""));
      return;
    }
    if (mode === "signup" || readInviteOrigin(browserStore())) {
      rememberPromoCode(promo, { kind: "discord" });
    }
    if (mode === "signup") {
      if (!captchaToken) {
        oauthLock.current = false;
        toast.error(TURNSTILE_RETRY);
        return;
      }
      const gate = await confirmHuman({ data: { captchaToken } });
      if (!gate.ok) {
        oauthLock.current = false;
        setCaptchaReset((n) => n + 1);
        toast.error(gate.error);
        return;
      }
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: DISCORD_PROVIDER,
      options: { redirectTo },
    });
    if (error) {
      oauthLock.current = false;
      setBusy(false);
      toast.error(discordSignInMessage(error.message, error.message));
    }
  }

  if (forgot) return <ForgotPassword onBack={() => setForgot(false)} />;

  if (pending) {
    return (
      <VerifyStep
        pending={pending}
        onPending={savePending}
        onVerified={async () => {
          const pw = password;
          const em = pending.email;
          savePending(null);
          setPassword("");
          if (pw) {
            const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
            if (!error) return;
          }
          toast.success("Email confirmed! Sign in with your password.");
          setEmail(em);
          setMode("signin");
        }}
        onChangeEmail={() => {
          savePending(null);
          setMode("signup");
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm py-6 sm:py-10">
      <h1 className="font-display text-2xl">
        {mode === "signin" ? "Welcome back" : "Create account"}
      </h1>
      {mode === "signup" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Create your account to play. You must be 18 or older.
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="mt-6 min-h-11 w-full"
        size="lg"
        disabled={busy || (mode === "signup" && !captchaToken)}
        onClick={continueWithDiscord}
      >
        <DiscordMark />
        Continue with Discord
      </Button>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={!authReady} className="contents">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                className="min-h-11 text-base"
                required
              />
            </div>
          )}
          {mode === "signup" && <PromoCodeField id="promo" value={promo} onChange={setPromo} />}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className="min-h-11 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="email-confirm">Confirm email</Label>
              <Input
                id="email-confirm"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                className="min-h-11 text-base"
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              {mode === "signin" ? (
                <button
                  type="button"
                  onClick={() => setForgot(true)}
                  className="min-h-11 text-sm text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
              ) : null}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              className="min-h-11 text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="password-confirm">Confirm password</Label>
              <Input
                id="password-confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                className="min-h-11 text-base"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>
          )}
          {mode === "signup" && (
            <div className="flex items-center gap-2">
              <Checkbox id="age" checked={age} onCheckedChange={(v) => setAge(v === true)} />
              <Label htmlFor="age" className="text-sm font-normal">
                I confirm I am 18 or older and accept the terms
              </Label>
            </div>
          )}
          {mode === "signup" && (
            <TurnstileField resetKey={captchaReset} onToken={setCaptchaToken} />
          )}
          <Button
            type="submit"
            className="min-h-11 w-full font-display"
            size="lg"
            disabled={!authReady || busy || (mode === "signup" && !captchaToken)}
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </fieldset>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 min-h-11 w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
      </button>
    </div>
  );
}

function VerifyStep({
  pending,
  onPending,
  onVerified,
  onChangeEmail,
}: {
  pending: Pending;
  onPending: (p: Pending) => void;
  onVerified: () => Promise<void>;
  onChangeEmail: () => void;
}) {
  const verify = useServerFn(verifySignupCodeFn);
  const resend = useServerFn(resendSignupCodeFn);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const inflight = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (code.length !== 6 || inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setError(null);
    verify({ data: { challengeId: pending.challengeId, code } })
      .then(async (r) => {
        if (r.ok) await onVerified();
        else {
          setError(r.error);
          setCode("");
        }
      })
      .catch(() => setError("Couldn't verify right now. Please try again."))
      .finally(() => {
        inflight.current = false;
        setBusy(false);
      });
  }, [code, pending.challengeId, verify, onVerified]);

  async function doResend() {
    setBusy(true);
    setError(null);
    try {
      const r = await resend({ data: { challengeId: pending.challengeId } });
      if (!r.ok) setError(r.error);
      else {
        onPending({ ...pending, challengeId: r.challengeId });
        setCode("");
        setCooldown(60);
        toast.success("New code sent.");
      }
    } catch {
      setError("Couldn't send the code right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="font-display text-2xl">Check your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a 6-digit code to{" "}
        <span className="font-mono text-foreground">{pending.maskedEmail}</span>. It expires in 10
        minutes.
      </p>
      <div className="mt-6">
        <OtpInput value={code} onChange={setCode} disabled={busy} />
      </div>
      <p className="mt-3 min-h-5 text-sm text-destructive" role="alert" aria-live="polite">
        {error}
      </p>
      <Button
        className="mt-2 w-full font-display"
        size="lg"
        disabled={busy || code.length !== 6}
        onClick={() => setCode((c) => c)}
      >
        {busy ? "Verifying…" : "Verify"}
      </Button>
      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={doResend}
          disabled={busy || cooldown > 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-muted-foreground hover:text-foreground"
        >
          Change email
        </button>
      </div>
    </div>
  );
}
