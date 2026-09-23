import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
      { title: "Sign in — PVPCasino" },
      { name: "description", content: "Sign in or create your PVPCasino account." },
      { property: "og:title", content: "Sign in — PVPCasino" },
      { property: "og:description", content: "Sign in or create your PVPCasino account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
        if (error) throw new Error(/confirm/i.test(error.message) ? "Confirme seu e-mail com o código antes de entrar." : "E-mail ou senha incorretos.");
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
