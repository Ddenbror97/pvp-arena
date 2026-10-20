import { queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCryptoActivity } from "@/lib/crypto/crypto.functions";
import { parseWithdrawCashSnapshot, type WithdrawCashSnapshot } from "@/lib/crypto/bonus-withdraw";
import { parseFundingChains, type FundingChain, type RailMovement } from "@/lib/crypto/rails";

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
