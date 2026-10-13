import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completePasswordResetFn,
  resendPasswordResetFn,
  startPasswordResetFn,
} from "@/lib/auth-otp/account.functions";

const field = "min-h-11 text-base";

export function ForgotPassword({ onBack }: { onBack: () => void }) {
  const start = useServerFn(startPasswordResetFn);
  const resend = useServerFn(resendPasswordResetFn);
  const complete = useServerFn(completePasswordResetFn);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<{ challengeId: string; maskedEmail: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
    setBusy(true);
    setError(null);
    try {
      const r = await start({ data: { email } });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSent({ challengeId: r.challengeId, maskedEmail: r.maskedEmail });
      setCooldown(60);
    } catch {
      setError("Couldn't send the code right now. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!sent) return;
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await complete({ data: { challengeId: sent.challengeId, code, password } });
      if (!r.ok) {
        setError(r.error);
        if (/invalid code/i.test(r.error)) setCode("");
        return;
      }
      toast.success("Password updated. Sign in with your new password.");
      onBack();
    } catch {
      setError("Couldn't update the password right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function doResend() {
    if (!sent) return;
    setBusy(true);
    setError(null);
    try {
      const r = await resend({ data: { challengeId: sent.challengeId } });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSent({ challengeId: r.challengeId, maskedEmail: r.maskedEmail || sent.maskedEmail });
      setCode("");
      setCooldown(60);
      toast.success("New code sent.");
    } catch {
      setError("Couldn't send the code right now.");
    } finally {
      setBusy(false);
    }
  }

  if (!sent) {
    return (
      <div className="mx-auto w-full max-w-sm py-6 sm:py-10">
        <h1 className="font-display text-2xl">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email on your account. If it matches, we'll send a 6-digit code.
        </p>
        <form onSubmit={requestCode} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="min-h-11 w-full font-display" size="lg" disabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </Button>
        </form>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 min-h-11 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm py-6 sm:py-10">
      <h1 className="font-display text-2xl">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a 6-digit code to{" "}
        <span className="font-mono text-foreground">{sent.maskedEmail || "your email"}</span>. It
        expires in 10 minutes.
      </p>
      <form onSubmit={savePassword} className="mt-6 space-y-4">
        <OtpInput value={code} onChange={setCode} disabled={busy} />
        <div className="space-y-1.5">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password-2">Confirm password</Label>
          <Input
            id="reset-password-2"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className={field}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="min-h-11 w-full font-display"
          size="lg"
          disabled={busy || code.length !== 6}
        >
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={doResend}
          disabled={busy || cooldown > 0}
          className="min-h-11 text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 text-muted-foreground hover:text-foreground"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
