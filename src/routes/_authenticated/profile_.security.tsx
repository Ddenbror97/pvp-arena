import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { OtpInput } from "@/components/auth/OtpInput";
import { IdentityCheck } from "@/components/profile/IdentityCheck";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordFn,
  completeEmailChangeFn,
  resendEmailChangeFn,
  startEmailChangeFn,
} from "@/lib/auth-otp/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  claimOAuthClick,
  DISCORD_PROVIDER,
  discordSignInMessage,
  isDiscordProvider,
  oauthRedirect,
} from "@/lib/discord-auth";

const field = "min-h-11 text-base";

export const Route = createFileRoute("/_authenticated/profile_/security")({
  head: () => ({
    meta: [
      { title: "Security — PVPspinArena" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Change the email and password on your PVPspinArena account.",
      },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const { session, signOut } = useAuth();
  const email = session?.user.email ?? "";
  const navigate = useNavigate();

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code =
      search.get("error_code") ||
      hash.get("error_code") ||
      search.get("error") ||
      hash.get("error");
    const description = search.get("error_description") || hash.get("error_description") || "";
    if (search.get("identity") === "done" && !code && !description) {
      const url = new URL(window.location.href);
      url.searchParams.delete("identity");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
      return;
    }
    if (!code && !description) return;
    toast.error(discordSignInMessage(code ?? "", description));
    const url = new URL(window.location.href);
    for (const key of ["error", "error_code", "error_description"]) url.searchParams.delete(key);
    url.hash = "";
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }, []);

  async function leave(message: string) {
    toast.success(message);
    try {
      await signOut();
    } catch {
      /* the server already revoked the session */
    }
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        to="/profile"
        className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
      >
        Back to profile
      </Link>
      <h1 className="font-display text-2xl sm:text-3xl">Security</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Change the email or password on this account. A code confirms a new email. An identity check
        is optional.
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <IdentityCheck />
        </div>
        <div className="lg:col-span-2">
          <DiscordCard
            linked={(session?.user.identities ?? []).some((identity) =>
              isDiscordProvider(identity.provider),
            )}
          />
        </div>
        <EmailCard
          current={email}
          onChanged={() => leave("Email updated. Sign in with your new email.")}
        />
        <PasswordCard
          onChanged={() => leave("Password updated. Sign in with your new password.")}
        />
      </div>
    </div>
  );
}

function DiscordCard({ linked }: { linked: boolean }) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function link() {
    if (linked || !claimOAuthClick(lock)) return;
    const redirectTo = oauthRedirect(window.location.origin, "/profile/security");
    if (!redirectTo) {
      lock.current = false;
      toast.error(discordSignInMessage("", ""));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.linkIdentity({
      provider: DISCORD_PROVIDER,
      options: { redirectTo },
    });
    if (error) {
      lock.current = false;
      setBusy(false);
      toast.error(discordSignInMessage(error.message, error.message));
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-sm uppercase tracking-widest">Discord</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {linked
              ? "Discord is linked to this account. Email and password still sign in."
              : "Link Discord while you are signed in. This account stays the same account."}
          </p>
        </div>
        {linked ? null : (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full shrink-0 sm:w-auto"
            disabled={busy}
            onClick={link}
          >
            {busy ? "Opening Discord…" : "Link Discord"}
          </Button>
        )}
      </div>
    </section>
  );
}

function EmailCard({ current, onChanged }: { current: string; onChanged: () => Promise<void> }) {
  const start = useServerFn(startEmailChangeFn);
  const resend = useServerFn(resendEmailChangeFn);
  const complete = useServerFn(completeEmailChangeFn);
  const [password, setPassword] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState<{ challengeId: string; maskedEmail: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (next.trim().toLowerCase() !== confirm.trim().toLowerCase()) {
      setError("Those email addresses don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await start({ data: { currentPassword: password, newEmail: next } });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPending({ challengeId: r.challengeId, maskedEmail: r.maskedEmail });
      setCooldown(60);
      setPassword("");
    } catch {
      setError("Couldn't send the code right now. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const r = await complete({ data: { challengeId: pending.challengeId, code } });
      if (!r.ok) {
        setError(r.error);
        if (/invalid code/i.test(r.error)) setCode("");
        return;
      }
      await onChanged();
    } catch {
      setError("Couldn't update the email right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function doResend() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const r = await resend({ data: { challengeId: pending.challengeId } });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPending({ challengeId: r.challengeId, maskedEmail: r.maskedEmail || pending.maskedEmail });
      setCode("");
      setCooldown(60);
      toast.success("New code sent.");
    } catch {
      setError("Couldn't send the code right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="h-full rounded-2xl border border-border bg-card p-4">
      <h2 className="font-display text-sm uppercase tracking-widest">Email</h2>
      <p className="mt-1 break-all text-sm text-muted-foreground">
        {current || "Loading your email…"}
      </p>
      {pending ? (
        <form onSubmit={confirmCode} className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the code sent to{" "}
            <span className="font-mono text-foreground">{pending.maskedEmail}</span>.
          </p>
          <OtpInput value={code} onChange={setCode} disabled={busy} />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="min-h-11 w-full font-display sm:w-auto"
            disabled={busy || code.length !== 6}
          >
            {busy ? "Updating…" : "Confirm email"}
          </Button>
          <div>
            <button
              type="button"
              onClick={doResend}
              disabled={busy || cooldown > 0}
              className="min-h-11 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={requestCode} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-email">New email</Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                className={field}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-email">Confirm email</Label>
              <Input
                id="confirm-new-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                className={field}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-password">Current password</Label>
            <Input
              id="email-password"
              type="password"
              autoComplete="current-password"
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="min-h-11 w-full font-display sm:w-auto" disabled={busy}>
            {busy ? "Sending…" : "Send confirmation code"}
          </Button>
        </form>
      )}
    </section>
  );
}

function PasswordCard({ onChanged }: { onChanged: () => Promise<void> }) {
  const change = useServerFn(changePasswordFn);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await change({ data: { currentPassword: current, newPassword: next } });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      await onChanged();
    } catch {
      setError("Couldn't update the password right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="h-full rounded-2xl border border-border bg-card p-4">
      <h2 className="font-display text-sm uppercase tracking-widest">Password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use your current password, then choose a new one.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            className={field}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className={field}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-new-password">Confirm password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className={field}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="min-h-11 w-full font-display sm:w-auto" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
    </section>
  );
}
