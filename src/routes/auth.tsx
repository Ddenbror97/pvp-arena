import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { OtpInput } from "@/components/auth/OtpInput";
import { resendSignupCodeFn, startSignupFn, verifySignupCodeFn } from "@/lib/auth-otp/signup.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — PVPspinArena" },
      { name: "description", content: "Sign in or create your PVPspinArena account." },
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

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const { userId } = useAuth();
  const navigate = useNavigate();
  const start = useServerFn(startSignupFn);

  useEffect(() => {
    if (userId) navigate({ to: "/" });
  }, [userId, navigate]);

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
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) throw new Error("Usernames are 3–20 letters, numbers or underscores.");
        if (!age) throw new Error("You must confirm you are 18 or older.");
        const r = await start({ data: { email, password, username, ageConfirmed: true } });
        if (!r.ok) throw new Error(r.error);
        savePending({ challengeId: r.challengeId, email: email.trim().toLowerCase(), maskedEmail: r.maskedEmail });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(/confirm/i.test(error.message) ? "Confirm your email with the code before signing in." : "Incorrect email or password.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

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
          toast.success("E-mail confirmado! Entre com sua senha.");
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
    <div className="mx-auto max-w-sm py-10">
      <h1 className="font-display text-2xl">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin" ? "Sign in to join the jackpot." : "New accounts get $1,000 in test credits (no cash value)."}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} required />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {mode === "signup" && (
          <div className="flex items-center gap-2">
            <Checkbox id="age" checked={age} onCheckedChange={(v) => setAge(v === true)} />
            <Label htmlFor="age" className="text-sm font-normal">I confirm I am 18 or older and accept the terms</Label>
          </div>
        )}
        <Button type="submit" className="w-full font-display" size="lg" disabled={busy}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
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
        We sent a 6-digit code to <span className="font-mono text-foreground">{pending.maskedEmail}</span>. It expires in 10 minutes.
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
        <button type="button" onClick={doResend} disabled={busy || cooldown > 0} className="text-muted-foreground hover:text-foreground disabled:opacity-50">
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        <button type="button" onClick={onChangeEmail} className="text-muted-foreground hover:text-foreground">
          Alterar e-mail
        </button>
      </div>
    </div>
  );
}
