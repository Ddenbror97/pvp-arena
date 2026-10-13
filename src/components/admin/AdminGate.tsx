import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/button";
import {
  adminGateStatusFn,
  createAdminPinFn,
  sendAdminDeviceCodeFn,
  verifyAdminDeviceCodeFn,
  verifyAdminPinFn,
} from "@/lib/admin/gate.functions";
import { pinsMatch, type AdminPhase } from "@/lib/admin/phase";
import { useAuth } from "@/lib/auth";

type Gate =
  | { admin: false }
  | { unavailable: true; error?: string }
  | {
      admin: true;
      phase: AdminPhase;
      maskedEmail?: string;
      challengeId?: string;
      error?: string;
    };

export function AdminGate({ children }: { children: ReactNode }) {
  const status = useServerFn(adminGateStatusFn);
  const query = useQuery({
    queryKey: ["admin-gate"],
    queryFn: () => status() as Promise<Gate>,
    retry: false,
  });

  if (query.isPending) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  const gate = query.data;
  if (query.isError || !gate || ("unavailable" in gate && gate.unavailable)) {
    return <p className="p-6 text-sm text-muted-foreground">Unable to load the admin panel.</p>;
  }
  if (!("phase" in gate)) {
    return <p className="p-6 text-sm text-muted-foreground">You don't have access to this page.</p>;
  }
  if (gate.phase === "ready") return children;
  return <AdminSecurity gate={gate} />;
}

function AdminSecurity({ gate }: { gate: Extract<Gate, { admin: true }> }) {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const createPin = useServerFn(createAdminPinFn);
  const verifyPin = useServerFn(verifyAdminPinFn);
  const sendCode = useServerFn(sendAdminDeviceCodeFn);
  const verifyCode = useServerFn(verifyAdminDeviceCodeFn);
  const [phase, setPhase] = useState(gate.phase);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState(gate.challengeId);
  const [maskedEmail, setMaskedEmail] = useState(gate.maskedEmail);
  const [error, setError] = useState(gate.error ?? "");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (resendAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resendAt]);

  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  async function finish() {
    setPin("");
    setConfirm("");
    setCode("");
    await queryClient.invalidateQueries({ queryKey: ["admin-gate"] });
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!pinsMatch(pin, confirm)) {
      setError("PINs do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await createPin({ data: { pin } });
      if (!result.ok) {
        setError(result.error ?? "Something went wrong. Try again.");
        return;
      }
      await finish();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
      setPin("");
      setConfirm("");
    }
  }

  async function onPin(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setError("Incorrect PIN.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await verifyPin({ data: { pin } });
      if (!result.ok) {
        setError(result.error ?? "Incorrect PIN.");
        return;
      }
      if (result.next === "otp" && "challengeId" in result) {
        setPhase("otp");
        setChallengeId(result.challengeId);
        setMaskedEmail(result.maskedEmail);
        setResendAt(Date.now() + 60_000);
        setCode("");
        return;
      }
      await finish();
    } catch {
      setError("Incorrect PIN.");
    } finally {
      setBusy(false);
      setPin("");
    }
  }

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!challengeId || !/^\d{6}$/.test(code)) {
      setError("That code is incorrect.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await verifyCode({ data: { challengeId, code } });
      if (!result.ok) {
        setError(result.error ?? "That code is incorrect.");
        return;
      }
      await finish();
    } catch {
      setError("That code is incorrect.");
    } finally {
      setBusy(false);
      setCode("");
    }
  }

  async function onResend() {
    if (wait > 0 || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await sendCode();
      if (!result.ok) {
        setError(result.error ?? "Couldn't send the code right now. Please try again shortly.");
        if (/wait/i.test(result.error ?? "")) setResendAt(Date.now() + 60_000);
        return;
      }
      setChallengeId(result.challengeId);
      setMaskedEmail(result.maskedEmail);
      setResendAt(Date.now() + 60_000);
      setCode("");
    } catch {
      setError("Couldn't send the code right now. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10">
      {phase === "setup" ? (
        <form onSubmit={onCreate} className="space-y-5">
          <div>
            <h1 className="font-display text-2xl">Create your 6-digit admin PIN</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This PIN stays on your account. It is not emailed.
            </p>
          </div>
          <OtpInput
            value={pin}
            onChange={setPin}
            disabled={busy}
            label="Create your 6-digit admin PIN"
            autoComplete="off"
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Confirm your PIN</p>
            <OtpInput
              value={confirm}
              onChange={setConfirm}
              disabled={busy}
              label="Confirm your PIN"
              autoComplete="off"
              autoFocus={false}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            className="min-h-11 w-full"
            disabled={busy || pin.length < 6 || confirm.length < 6}
          >
            {busy ? "Saving…" : "Continue"}
          </Button>
        </form>
      ) : null}

      {phase === "pin" ? (
        <form onSubmit={onPin} className="space-y-5">
          <h1 className="font-display text-2xl">Enter your admin PIN</h1>
          <OtpInput
            value={pin}
            onChange={setPin}
            disabled={busy}
            label="Enter your admin PIN"
            autoComplete="off"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="min-h-11 w-full" disabled={busy || pin.length < 6}>
            {busy ? "Checking…" : "Continue"}
          </Button>
        </form>
      ) : null}

      {phase === "otp" ? (
        <form onSubmit={onVerify} className="space-y-5">
          <div>
            <h1 className="font-display text-2xl">Verify your sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a 6-digit verification code to your admin email
              {maskedEmail ? ` (${maskedEmail})` : ""}.
            </p>
          </div>
          <OtpInput value={code} onChange={setCode} disabled={busy} label="Verification code" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            className="min-h-11 w-full"
            disabled={busy || code.length < 6 || !challengeId}
          >
            {busy ? "Checking…" : "Verify"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full"
            disabled={busy || wait > 0}
            onClick={onResend}
          >
            {wait > 0 ? `Resend code (${wait}s)` : "Resend code"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full"
            onClick={() => signOut()}
          >
            Sign out
          </Button>
        </form>
      ) : null}
    </div>
  );
}
