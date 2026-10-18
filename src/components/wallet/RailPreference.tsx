import { useEffect, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TokenMark } from "@/components/wallet/TokenMark";
import { getCryptoActivity } from "@/lib/crypto/crypto.functions";
import { parseWithdrawCashSnapshot, type WithdrawCashSnapshot } from "@/lib/crypto/bonus-withdraw";
import { formatUsd } from "@/lib/jackpot/math";
import {
  balanceTriggerLabel,
  inferHeldAsset,
  listHeaderRails,
  parseFundingChains,
  railEquivalent,
  readStoredRail,
  resolveRail,
  writeStoredRail,
  type HeldAsset,
  type FundingAssetRow,
  type FundingChain,
  type RailMovement,
} from "@/lib/crypto/rails";

export type CryptoActivity = {
  chains: FundingChain[];
  deposits: RailMovement[];
  withdrawals: RailMovement[];
  settings: {
    deposits_enabled: boolean;
    withdrawals_enabled: boolean;
    min_deposit_cents: number;
    min_withdrawal_cents: number;
    daily_limit_cents: number;
    fee_cents: number;
    auto_approve_cents: number;
  };
  wallet: string | null;
  withdraw: WithdrawCashSnapshot | null;
  bitcoin: BitcoinActivity[];
  bitcoinPayouts: BitcoinPayoutActivity[];
  card: CardActivity[];
};

export type CardActivity = {
  id: string;
  usd_cents: number;
  status: string;
  at: string;
};

export type BitcoinActivity = {
  id: string;
  usd_cents: number;
  status: string;
  at: string;
  btc_due: string | null;
  required_confirmations: number;
};

export type BitcoinPayoutActivity = {
  id: string;
  usd_cents: number;
  status: string;
  at: string;
  address: string;
};

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function parseCryptoActivity(raw: unknown): CryptoActivity {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const settings =
    row["settings"] && typeof row["settings"] === "object"
      ? (row["settings"] as CryptoActivity["settings"])
      : null;
  const movements = (value: unknown, atKey: "detected_at" | "created_at"): RailMovement[] => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const movement = item as Record<string, unknown>;
      if (
        typeof movement["asset_key"] !== "string" ||
        typeof movement["status"] !== "string" ||
        typeof movement["id"] !== "string"
      )
        return [];
      const at = movement[atKey];
      const decimals =
        typeof movement["decimals"] === "number" && Number.isInteger(movement["decimals"])
          ? movement["decimals"]
          : null;
      const chainId =
        typeof movement["chain_id"] === "number"
          ? movement["chain_id"]
          : Number(movement["chain_id"]);
      return [
        {
          id: movement["id"],
          chain_id: Number.isInteger(chainId) ? chainId : null,
          asset_key: movement["asset_key"],
          units: String(movement["units"] ?? "0"),
          usd_cents: Number(movement["usd_cents"] ?? 0),
          status: movement["status"],
          at: typeof at === "string" ? at : "",
          decimals,
          tx_hash: typeof movement["tx_hash"] === "string" ? movement["tx_hash"] : null,
        },
      ];
    });
  };
  return {
    chains: parseFundingChains(row["chains"]),
    deposits: movements(row["deposits"], "detected_at"),
    withdrawals: movements(row["withdrawals"], "created_at"),
    settings: {
      deposits_enabled: !!settings?.deposits_enabled,
      withdrawals_enabled: !!settings?.withdrawals_enabled,
      min_deposit_cents: Number(settings?.min_deposit_cents ?? 0),
      min_withdrawal_cents: Number(settings?.min_withdrawal_cents ?? 0),
      daily_limit_cents: Number(settings?.daily_limit_cents ?? 0),
      fee_cents: Number(settings?.fee_cents ?? 0),
      auto_approve_cents: Number(settings?.auto_approve_cents ?? 0),
    },
    wallet: typeof row["wallet"] === "string" ? row["wallet"] : null,
    withdraw: parseWithdrawCashSnapshot(row["withdraw"]),
    bitcoin: parseBitcoinActivity(row["bitcoin"]),
    bitcoinPayouts: parseBitcoinPayouts(row["bitcoin_payouts"]),
    card: parseCardActivity(row["card"]),
  };
}

function parseCardActivity(value: unknown): CardActivity[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row["id"] !== "string" || typeof row["status"] !== "string") return [];
    const cents = Number(row["usd_cents"]);
    if (!Number.isSafeInteger(cents) || cents <= 0) return [];
    const at = row["created_at"];
    return [
      {
        id: row["id"],
        usd_cents: cents,
        status: row["status"],
        at: typeof at === "string" ? at : "",
      },
    ];
  });
}

function parseBitcoinActivity(value: unknown): BitcoinActivity[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row["id"] !== "string" || typeof row["status"] !== "string") return [];
    const cents = Number(row["usd_cents"]);
    if (!Number.isSafeInteger(cents) || cents <= 0) return [];
    const at = row["created_at"];
    return [
      {
        id: row["id"],
        usd_cents: cents,
        status: row["status"],
        at: typeof at === "string" ? at : "",
        btc_due: typeof row["btc_due"] === "string" ? row["btc_due"] : null,
        required_confirmations: Number.isInteger(row["required_confirmations"])
          ? Number(row["required_confirmations"])
          : 2,
      },
    ];
  });
}

function parseBitcoinPayouts(value: unknown): BitcoinPayoutActivity[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row["id"] !== "string" || typeof row["status"] !== "string") return [];
    const cents = Number(row["usd_cents"]);
    if (!Number.isSafeInteger(cents) || cents <= 0) return [];
    const at = row["created_at"];
    return [
      {
        id: row["id"],
        usd_cents: cents,
        status: row["status"],
        at: typeof at === "string" ? at : "",
        address: typeof row["address"] === "string" ? row["address"] : "",
      },
    ];
  });
}

export function cryptoActivityQuery(
  fetchActivity: () => ReturnType<typeof getCryptoActivity> = () => getCryptoActivity(),
) {
  return queryOptions({
    queryKey: ["crypto-activity"],
    queryFn: async () => parseCryptoActivity(await fetchActivity()),
    staleTime: 15_000,
  });
}

export function useCryptoActivity(enabled: boolean) {
  const fetchActivity = useServerFn(getCryptoActivity);
  return useQuery({
    ...cryptoActivityQuery(fetchActivity),
    enabled,
    // External wallet sends never hit the in-page button, so keep looking.
    refetchInterval: enabled ? 20_000 : false,
  });
}

export function useFundingRail(
  rails: readonly { asset_key: string }[] | undefined,
  inferred: HeldAsset | null,
) {
  const [pinned, setPinned] = useState<{ asset: string; forHeld: HeldAsset | null } | null>(null);
  const keys = rails?.map((asset) => asset.asset_key).join("\n") ?? "";
  const rail = pinned && pinned.forHeld === inferred ? pinned.asset : inferred;
  useEffect(() => {
    if (!rails) return;
    const stored = readStoredRail(browserStorage());
    const selectable = rails.map((asset) => asset.asset_key);
    if (stored && stored !== "BTC" && stored !== resolveRail(stored, selectable)) {
      writeStoredRail(browserStorage(), null);
    }
    if (rail) writeStoredRail(browserStorage(), rail);
  }, [keys, rail]);
  const select = (next: string | null) => {
    const selectable = rails?.map((asset) => asset.asset_key) ?? [];
    const resolved = next === "BTC" ? "BTC" : resolveRail(next, selectable);
    if (!resolved) return;
    writeStoredRail(browserStorage(), resolved);
    setPinned({ asset: resolved, forHeld: inferred });
  };
  return { rail, select };
}

export function useHeaderFunding(enabled: boolean) {
  const activity = useCryptoActivity(enabled);
  const rails = activity.data ? listHeaderRails(activity.data.chains) : undefined;
  const inferred = activity.data ? heldAssetFromActivity(activity.data) : null;
  const preference = useFundingRail(rails, inferred);
  return {
    rail: preference.rail,
    select: preference.select,
    rails: rails ?? [],
    assetLoading: enabled && activity.isLoading,
  };
}

function heldAssetFromActivity(activity: CryptoActivity): HeldAsset {
  return inferHeldAsset({
    deposits: activity.deposits,
    withdrawals: activity.withdrawals,
    bitcoinDeposits: activity.bitcoin,
    bitcoinPayouts: activity.bitcoinPayouts,
  });
}

export function BalanceRailButton({
  available,
  loading,
  rail,
  rails,
  assetLoading,
  onSelect,
  className,
}: {
  available?: number | undefined;
  loading: boolean;
  rail: string | null;
  rails: FundingAssetRow[];
  assetLoading: boolean;
  onSelect: (assetKey: string | null) => void;
  className: string;
}) {
  const cents = available ?? 0;
  const usd = formatUsd(cents);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={className}
          aria-label={balanceTriggerLabel(loading ? "loading" : usd, rail)}
        >
          <span className="flex items-center justify-end gap-1">
            <span className="flex h-4 w-[4.75rem] shrink-0 items-center justify-end sm:w-[5.25rem]">
              {loading ? (
                <span aria-hidden className="h-3.5 w-full animate-pulse rounded bg-muted" />
              ) : (
                <span className="tabular truncate text-[13px] font-semibold leading-none sm:text-sm">
                  {usd}
                </span>
              )}
            </span>
            <span className="flex h-4 w-[3.25rem] shrink-0 items-center gap-1">
              {rail ? (
                <>
                  <TokenMark asset={rail} className="h-4 w-4" />
                  <span className="text-[11px] font-semibold leading-none tracking-wide">{rail}</span>
                </>
              ) : null}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={8}
        className="w-auto min-w-[9.5rem] p-1"
      >
        <RailMenu
          cents={cents}
          loading={loading || assetLoading}
          rails={rails}
          rail={rail}
          onSelect={onSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

function RailMenu({
  cents,
  loading,
  rails,
  rail,
  onSelect,
}: {
  cents: number;
  loading: boolean;
  rails: FundingAssetRow[];
  rail: string | null;
  onSelect: (assetKey: string | null) => void;
}) {
  return (
    <div>
      {loading ? (
        <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</p>
      ) : rails.length === 0 ? (
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          No funding assets are available right now.
        </p>
      ) : (
        <div role="radiogroup" aria-label="Funding rail" className="flex flex-col">
          {rails.map((asset) => {
            const amount = heldAmount(asset, cents);
            const selected = rail === asset.asset_key;
            return (
              <button
                key={asset.asset_key}
                type="button"
                role="radio"
                aria-checked={selected}
                title={
                  asset.payout_ready ? amount : `${amount}. Withdrawals temporarily unavailable`
                }
                onClick={() => onSelect(asset.asset_key)}
                className={`flex h-8 items-center gap-2 rounded-md px-1.5 text-left hover:bg-muted ${selected ? "bg-muted" : ""}`}
              >
                <TokenMark asset={asset.asset_key} className="h-5 w-5" />
                <span className="tabular text-sm leading-none">{amount}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function heldAmount(asset: FundingAssetRow, cents: number): string {
  const text = railEquivalent(asset, cents);
  if (text) return text.replace(/^≈\s*/, "");
  if (cents > 0) return asset.asset_key;
  return `0 ${asset.asset_key}`;
}
