import { useEffect, useRef } from "react";
import { Check, CircleAlert, LoaderCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDepositNotice } from "@/lib/crypto/deposit-notify";
import { useWithdrawalNotice } from "@/lib/crypto/withdraw-notify";
import type { DepositNotice as DepositNoticeModel } from "@/lib/crypto/deposit-notice";
import type { WithdrawalNotice } from "@/lib/crypto/withdraw-notice";

/** Stays on screen across pages until the deposit lands or the player dismisses it. */
function NoticeCard({
  notice,
  tone,
  dismissLabel,
  onDismiss,
}: {
  notice: DepositNoticeModel | WithdrawalNotice;
  tone: "waiting" | "confirmed" | "problem";
  dismissLabel: string;
  onDismiss: () => void;
}) {
  const iconClass =
    tone === "waiting"
      ? "bg-primary/15 text-primary"
      : tone === "problem"
        ? "bg-amber-500/15 text-amber-500"
        : "bg-emerald-500/15 text-emerald-500";
  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}
          aria-hidden="true"
        >
          {tone === "waiting" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : tone === "problem" ? (
            <CircleAlert className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm">{notice.title}</p>
          {notice.amount ? (
            <p className="tabular truncate text-sm font-semibold">{notice.amount}</p>
          ) : null}
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{notice.body}</p>
          {tone === "waiting" ? (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function DepositNotice() {
  const { userId } = useAuth();
  const deposit = useDepositNotice(userId);
  const withdrawal = useWithdrawalNotice(userId);
  const depositDismiss = useRef(deposit.dismiss);
  const withdrawalDismiss = useRef(withdrawal.dismiss);
  depositDismiss.current = deposit.dismiss;
  withdrawalDismiss.current = withdrawal.dismiss;

  useEffect(() => {
    if (deposit.notice?.phase !== "confirmed") return;
    const timer = window.setTimeout(() => depositDismiss.current(), 8000);
    return () => window.clearTimeout(timer);
  }, [deposit.notice?.key, deposit.notice?.phase]);

  useEffect(() => {
    if (withdrawal.notice?.phase !== "confirmed") return;
    const timer = window.setTimeout(() => withdrawalDismiss.current(), 8000);
    return () => window.clearTimeout(timer);
  }, [withdrawal.notice?.key, withdrawal.notice?.phase]);

  if (!deposit.notice && !withdrawal.notice) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[45] flex flex-col items-center gap-2 px-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-auto lg:top-20 lg:items-end lg:px-4"
    >
      {deposit.notice ? (
        <NoticeCard
          notice={deposit.notice}
          tone={
            deposit.notice.phase === "waiting"
              ? "waiting"
              : deposit.notice.phase === "confirmed"
                ? "confirmed"
                : "problem"
          }
          dismissLabel="Dismiss deposit notice"
          onDismiss={deposit.dismiss}
        />
      ) : null}
      {withdrawal.notice ? (
        <NoticeCard
          notice={withdrawal.notice}
          tone={withdrawal.notice.phase}
          dismissLabel="Dismiss withdrawal notice"
          onDismiss={withdrawal.dismiss}
        />
      ) : null}
    </div>
  );
}
