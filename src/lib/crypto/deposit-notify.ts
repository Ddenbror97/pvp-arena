import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCryptoActivity } from "@/components/wallet/RailPreference";
import {
  selectDepositNotice,
  type DepositNotice,
  type DepositNoticeRow,
  type SubmittedDeposit,
} from "@/lib/crypto/deposit-notice";

export const DEPOSIT_SUBMITTED = "pvp:deposit-submitted";

/** Tell every page that MetaMask just sent a deposit. The card appears at once. */
export function announceDepositSubmitted(detail: {
  usdCents: number;
  asset: string;
  networkMode: string;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DEPOSIT_SUBMITTED, { detail }));
}

/**
 * Deposit progress for the signed-in header. The browser cannot subscribe to
 * deposit rows, so this watches the activity the wallet already loads and
 * refreshes it while a transfer is in flight.
 */
export function useDepositNotice(userId: string | null): {
  notice: DepositNotice | null;
  dismiss: () => void;
} {
  const activity = useCryptoActivity(!!userId);
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState<SubmittedDeposit | null>(null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const [now, setNow] = useState(() => Date.now());
  const baseline = useRef<Set<string> | null>(null);
  const baselineUser = useRef<string | null>(null);
  const credited = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onSubmit = (event: Event) => {
      const detail = (
        event as CustomEvent<{ usdCents?: number; asset?: string; networkMode?: string }>
      ).detail;
      if (!detail || typeof detail.usdCents !== "number" || typeof detail.asset !== "string")
        return;
      setSubmitted({
        usdCents: detail.usdCents,
        asset: detail.asset,
        networkMode: typeof detail.networkMode === "string" ? detail.networkMode : "mainnet",
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
    window.addEventListener(DEPOSIT_SUBMITTED, onSubmit);
    return () => window.removeEventListener(DEPOSIT_SUBMITTED, onSubmit);
  }, []);

  if (baselineUser.current !== userId) {
    baselineUser.current = userId;
    baseline.current = null;
    credited.current = new Set();
  }
  if (baseline.current === null && activity.data) {
    baseline.current = new Set([
      ...activity.data.deposits.filter((row) => row.status === "CREDITED").map((row) => row.id),
      ...activity.data.bitcoin.filter((row) => row.status === "CREDITED").map((row) => row.id),
    ]);
  }

  const chains = activity.data?.chains ?? [];
  const deposits: DepositNoticeRow[] = [
    ...(activity.data?.deposits ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      usd_cents: row.usd_cents,
      asset_key: row.asset_key,
      at: row.at || null,
      networkMode: chains.find((chain) => chain.chain_id === row.chain_id)?.network_mode ?? null,
    })),
    ...(activity.data?.bitcoin ?? []).flatMap((row) => {
      const status =
        row.status === "CREDITED"
          ? "CREDITED"
          : row.status === "REVIEW"
            ? "UNMATCHED"
            : row.status === "PROCESSING" || row.status === "SETTLED"
              ? "DETECTED"
              : null;
      if (!status) return [];
      return [
        {
          id: row.id,
          status,
          usd_cents: row.usd_cents,
          asset_key: "BTC",
          at: row.at || null,
          networkMode: "bitcoin" as const,
        },
      ];
    }),
  ].sort((a, b) => Date.parse(b.at ?? "") - Date.parse(a.at ?? ""));
  const notice = userId
    ? selectDepositNotice({
        deposits,
        baselineCredited: baseline.current ?? new Set(),
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
    if (notice?.phase !== "confirmed" || !userId) return;
    const id = notice.key.slice("confirmed:".length);
    if (credited.current.has(id)) return;
    credited.current.add(id);
    setSubmitted(null);
    qc.invalidateQueries({ queryKey: ["wallet", userId] });
    qc.invalidateQueries({ queryKey: ["crypto-activity"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
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
