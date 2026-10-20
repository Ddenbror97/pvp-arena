import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sendWithdrawalCode } from "@/lib/auth-otp/withdrawal.functions";
import { withdrawalScope, type WithdrawalTarget } from "@/lib/auth-otp/otp";

/** Errors after which the same code can still be retried; anything else needs a fresh code. */
const RETRYABLE = /^(Invalid code\.|Enter the 6-digit code)/;

/** One emailed code per withdrawal. Sending again for the same amount and destination reuses it. */
export function useWithdrawalCode() {
  const sendFn = useServerFn(sendWithdrawalCode);
  const [sent, setSent] = useState<{
    scope: string;
    challengeId: string;
    maskedEmail: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [prompt, setPrompt] = useState(0);

  async function send(target: WithdrawalTarget, again = false): Promise<boolean> {
    const scope = withdrawalScope(target);
    if (!again && sent?.scope === scope) {
      setPrompt((n) => n + 1);
      return true;
    }
    setSending(true);
    try {
      const r = await sendFn({ data: target });
      if (!r.ok) {
        toast.error(r.error);
        return false;
      }
      const same = sent?.challengeId === r.challengeId;
      setSent({ scope, challengeId: r.challengeId, maskedEmail: r.maskedEmail });
      if (!same) setCode("");
      setPrompt((n) => n + 1);
      if (r.reused) toast.message("Enter the code we already sent to your email.");
      return true;
    } finally {
      setSending(false);
    }
  }
  function proof(target: WithdrawalTarget) {
    return sent && sent.scope === withdrawalScope(target) && code.length === 6
      ? { challengeId: sent.challengeId, code }
      : null;
  }
  function sentFor(target: WithdrawalTarget) {
    return !!sent && sent.scope === withdrawalScope(target);
  }
  /** Call with the server error after a failed submit. */
  function failed(error: string) {
    if (RETRYABLE.test(error)) setCode("");
    else {
      setSent(null);
      setCode("");
    }
  }
  function clear() {
    setSent(null);
    setCode("");
  }
  return { sent, code, setCode, sending, prompt, send, proof, sentFor, failed, clear };
}

export function WithdrawalCodeField({
  ctl,
  target,
  disabled,
  onConfirm,
  confirmLabel = "Confirm withdrawal",
}: {
  ctl: ReturnType<typeof useWithdrawalCode>;
  target: WithdrawalTarget;
  disabled?: boolean;
  onConfirm?: () => void;
  confirmLabel?: string;
}) {
  const sent = ctl.sentFor(target);
  const ticket = `${ctl.sent?.challengeId ?? ""}:${ctl.prompt}`;
  const [dismissed, setDismissed] = useState<string | null>(null);
  // Open on the same paint as a successful send, including a code that was already emailed.
  const open = sent && dismissed !== ticket;
  const allowClose = useRef(false);
  useEffect(() => {
    if (!open) {
      allowClose.current = false;
      return;
    }
    allowClose.current = false;
    const id = window.setTimeout(() => {
      allowClose.current = true;
    }, 400);
    return () => window.clearTimeout(id);
  }, [open, ticket]);

  if (!sent) return null;
  const ready = ctl.code.length === 6;
  return (
    <>
      {open ? null : (
        <button
          type="button"
          className="text-xs font-semibold text-primary hover:underline"
          onClick={() => setDismissed(null)}
        >
          Enter email code
        </button>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Ignore the opener click landing on the new overlay and closing it immediately.
          if (!next && allowClose.current) setDismissed(ticket);
        }}
      >
        <DialogContent
          className="max-w-[18rem] gap-3 p-4 sm:rounded-xl"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className="space-y-1 text-center sm:text-center">
            <DialogTitle className="text-base">Enter code</DialogTitle>
            <DialogDescription className="text-xs">
              Sent to <span className="font-semibold text-foreground">{ctl.sent?.maskedEmail}</span>
              . It approves only this withdrawal.
            </DialogDescription>
          </DialogHeader>
          <OtpInput compact value={ctl.code} onChange={ctl.setCode} disabled={!!disabled} />
          {onConfirm ? (
            <Button
              type="button"
              className="h-9 w-full"
              disabled={!!disabled || !ready}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          ) : null}
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            disabled={ctl.sending || disabled}
            onClick={() => void ctl.send(target, true)}
          >
            {ctl.sending ? "Sending…" : "Send a new code"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
