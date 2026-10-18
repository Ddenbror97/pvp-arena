import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCryptoActivity } from "@/components/wallet/RailPreference";
import {
  selectWithdrawalNotice,
  type SubmittedWithdrawal,
  type WithdrawalNotice,
  type WithdrawalNoticeRow,
} from "@/lib/crypto/withdraw-notice";

export const WITHDRAWAL_SUBMITTED = "pvp:withdrawal-submitted";

/** Tell every page that a cashout was just requested. The card appears at once. */
export function announceWithdrawalSubmitted(detail: {
  usdCents: number;
  asset: string;
  network: "bitcoin" | "base";
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WITHDRAWAL_SUBMITTED, { detail }));
}

export function useWithdrawalNotice(userId: string | null): {
  notice: WithdrawalNotice | null;
  dismiss: () => void;
} {
  const activity = useCryptoActivity(!!userId);
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState<SubmittedWithdrawal | null>(null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const [now, setNow] = useState(() => Date.now());
  const baseline = useRef<Set<string> | null>(null);
  const baselineUser = useRef<string | null>(null);

  useEffect(() => {
    const onSubmit = (event: Event) => {
      const detail = (
        event as CustomEvent<{ usdCents?: number; asset?: string; network?: string }>
      ).detail;
      if (
        !detail ||
        typeof detail.usdCents !== "number" ||
        typeof detail.asset !== "string" ||
        (detail.network !== "bitcoin" && detail.network !== "base")
      )
        return;
      setSubmitted({
        usdCents: detail.usdCents,
        asset: detail.asset,
        network: detail.network,
        at: Date.now(),
      });
      setDismissed((current) => {
        if (!current.has("submitted")) return current;
        const next = new Set(current);
        next.delete("submitted");
        return next;
      });
      setNow(Date.now());
    };
    window.addEventListener(WITHDRAWAL_SUBMITTED, onSubmit);
    return () => window.removeEventListener(WITHDRAWAL_SUBMITTED, onSubmit);
  }, []);

  if (baselineUser.current !== userId) {
    baselineUser.current = userId;
    baseline.current = null;
  }
  if (baseline.current === null && activity.data) {
    baseline.current = new Set([
      ...activity.data.bitcoinPayouts
        .filter((row) => row.status === "COMPLETED")
        .map((row) => row.id),
      ...activity.data.withdrawals
        .filter((row) => row.status === "CONFIRMED")
        .map((row) => row.id),
    ]);
  }

  const withdrawals: WithdrawalNoticeRow[] = [
    ...(activity.data?.bitcoinPayouts ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      usd_cents: row.usd_cents,
      asset: "BTC",
      network: "bitcoin" as const,
      at: row.at || null,
    })),
    ...(activity.data?.withdrawals ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      usd_cents: row.usd_cents,
      asset: row.asset_key,
      network: "base" as const,
      at: row.at || null,
    })),
  ].sort((a, b) => Date.parse(b.at ?? "") - Date.parse(a.at ?? ""));

  const notice = userId
    ? selectWithdrawalNotice({
        withdrawals,
        baselineSent: baseline.current ?? new Set(),
        dismissed,
        submitted,
        now,
      })
    : null;

  useEffect(() => {
    if (notice?.phase !== "waiting") return;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["crypto-activity"] });
    }, 8000);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
    };
  }, [notice?.phase, qc]);

  useEffect(() => {
    if (notice?.phase !== "sent" || !userId) return;
    setSubmitted(null);
    qc.invalidateQueries({ queryKey: ["wallet", userId] });
    qc.invalidateQueries({ queryKey: ["crypto-activity"] });
  }, [notice?.key, notice?.phase, userId, qc]);

  const dismiss = useCallback(() => {
    if (!notice) return;
    const id =
      notice.key === "submitted" ? "submitted" : notice.key.slice(notice.key.indexOf(":") + 1);
    setDismissed((current) => new Set(current).add(id));
    if (notice.key === "submitted") setSubmitted(null);
  }, [notice]);

  return { notice, dismiss };
}
