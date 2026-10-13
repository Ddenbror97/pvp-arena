import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatUsd } from "@/lib/jackpot/math";
import {
  getBtcHotWallet,
  getCryptoAdmin,
  reviewCryptoWithdrawal,
  setCryptoSwitches,
  setTreasuryMinReserve,
} from "@/lib/crypto/crypto.functions";
import { formatEthEquivalent } from "@/lib/crypto/eth-price";
import { formatCryptoUnits } from "@/lib/crypto/rails";
import { decimalToUnits } from "@/lib/crypto/btcpay/policy";

export function CryptoAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(getCryptoAdmin);
  const review = useServerFn(reviewCryptoWithdrawal);
  const setSw = useServerFn(setCryptoSwitches);
  const [busy, setBusy] = useState(false);
  const inflight = useRef(false);
  const q = useQuery({
    queryKey: ["crypto-admin"],
    queryFn: () => load(),
    refetchInterval: 20_000,
  });
  const d = q.data;
  if (!d) return null;
  const s = d.settings;

  async function toggle(key: "system" | "deposits" | "withdrawals", v: boolean) {
    if (inflight.current) return;
    inflight.current = true;
    const label = key === "system" ? "the crypto system" : key;
    if (
      !window.confirm(
        v ? `Turn ${label} on?` : `Turn ${label} off? New activity on that switch stops.`,
      )
    ) {
      inflight.current = false;
      return;
    }
    const next = {
      system: s.crypto_system_enabled,
      deposits: s.deposits_enabled,
      withdrawals: s.withdrawals_enabled,
      [key]: v,
    };
    setBusy(true);
    try {
      const r = await setSw({ data: next });
      if (!r.ok) toast.error(r.error);
      else await qc.invalidateQueries({ queryKey: ["crypto-admin"] });
    } catch {
      toast.error("Request failed");
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }
  async function act(id: string, approve: boolean) {
    if (inflight.current) return;
    inflight.current = true;
    if (
      !window.confirm(
        approve
          ? "Approve this withdrawal? It can be broadcast."
          : "Reject this withdrawal? The held amount goes back to the player's available balance.",
      )
    ) {
      inflight.current = false;
      return;
    }
    setBusy(true);
    try {
      const r = await review({ data: { id, approve } });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(approve ? "Approved" : "Rejected and refunded");
        await qc.invalidateQueries({ queryKey: ["crypto-admin"] });
      }
    } catch {
      toast.error("Request failed");
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="flex items-center gap-3">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Switches</h3>
        <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">
          REAL FUNDS
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-6 rounded-2xl border border-border bg-card p-4 text-sm">
        {(
          [
            ["system", "Crypto system", s.crypto_system_enabled],
            ["deposits", "Deposits", s.deposits_enabled],
            ["withdrawals", "Withdrawals", s.withdrawals_enabled],
          ] as const
        ).map(([k, label, v]) => (
          <label key={k} className="flex items-center gap-2">
            <Switch checked={v} disabled={busy} onCheckedChange={(c) => void toggle(k, c)} />{" "}
            {label}
          </label>
        ))}
        <span className="text-muted-foreground">
          Ledger custody: <b className="text-foreground">{formatUsd(d.custody_cents)}</b>
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Chainlink Base ETH/USD is accepted for 22 minutes (20 minute heartbeat plus skew). A server
        read older than {Math.round(s.price_max_age_seconds / 60)} minutes is not used. Deposit ETH
        and payout ETH are separate wallets.
      </p>
      <Inventory books={d.eth_books} rows={d.inventory ?? []} />
      <TreasuryLiquidity
        rows={(d.treasury ?? []) as TreasuryRow[]}
        onSaved={() => qc.invalidateQueries({ queryKey: ["crypto-admin"] })}
      />
      <BtcHotWalletTopup />

      <h3 className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
        Withdrawals in progress
      </h3>
      <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card text-sm">
        {d.pending.length === 0 && <li className="p-3 text-muted-foreground">None.</li>}
        {d.pending.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="flex-1">
              {w.username} · {w.asset_key} · {formatUsd(w.usd_cents)} →{" "}
              <span className="font-mono text-xs">{w.to_address.slice(0, 10)}…</span>
            </span>
            <span className="text-xs">{w.status}</span>
            {w.status === "PENDING" && (
              <>
                <Button size="sm" disabled={busy} onClick={() => void act(w.id, true)}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void act(w.id, false)}
                >
                  Reject
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
        Unmatched deposits
      </h3>
      <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card text-sm">
        {d.unmatched.length === 0 && <li className="p-3 text-muted-foreground">None.</li>}
        {d.unmatched.map((x) => (
          <li key={x.id} className="p-3 font-mono text-xs">
            {x.asset_key} from {x.from_address} · {formatUsd(x.usd_cents)} ·{" "}
            {x.tx_hash.slice(0, 12)}…
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Alerts</h3>
      <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card text-sm">
        {d.incidents.length === 0 && <li className="p-3 text-muted-foreground">No alerts.</li>}
        {d.incidents.map((i, n) => (
          <li key={n} className="p-3 text-xs">
            <b>{i.check_name}</b> × {i.occurrences} · {new Date(i.last_seen_at).toLocaleString()} ·{" "}
            <span className="font-mono">{JSON.stringify(i.details)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Inventory({
  books,
  rows,
}: {
  books: {
    deposit_liability_cents?: number;
    withdrawn_cents?: number;
    pending_eth_cents?: number;
    pending_eth_wei?: string | number;
    pending_usdc_cents?: number;
    awaiting_valuation?: number;
  } | null;
  rows: {
    chain_id: number;
    eth_price_micro_usd?: number | null;
    deposit_wei?: string;
    payout_wei?: string;
    observed_at: string;
    price_ok?: boolean;
    payout_usdc_units?: string | number;
    deposit_usdc_units?: string | number;
    hot_key_matches?: boolean | null;
  }[];
}) {
  const b = books ?? {};
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
        ETH and USDC inventory
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        ETH credited since the launch reset is a liability. Coins already in the wallets are the
        inventory reading below, not that total.
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          ETH deposits since launch{" "}
          <b className="tabular">{formatUsd(b.deposit_liability_cents ?? 0)}</b>
        </div>
        <div>
          ETH withdrawals since launch{" "}
          <b className="tabular">{formatUsd(b.withdrawn_cents ?? 0)}</b>
        </div>
        <div>
          ETH payouts waiting <b className="tabular">{formatUsd(b.pending_eth_cents ?? 0)}</b> ·{" "}
          <span className="font-mono text-xs">{String(b.pending_eth_wei ?? 0)} wei</span>
        </div>
        <div>
          USDC payouts waiting <b className="tabular">{formatUsd(b.pending_usdc_cents ?? 0)}</b>
        </div>
        <div>
          ETH deposits awaiting a price{" "}
          <b className="tabular">{Number(b.awaiting_valuation ?? 0)}</b>
        </div>
      </dl>
      <ul className="mt-3 space-y-2 text-xs">
        {rows.length === 0 && (
          <li className="text-muted-foreground">
            No on-chain reading yet. The worker records one each minute.
          </li>
        )}
        {rows.map((row) => {
          const price = row.eth_price_micro_usd ? Number(row.eth_price_micro_usd) : 0;
          const depositEth = formatWei(row.deposit_wei ?? "0");
          const payoutEth = formatWei(row.payout_wei ?? "0");
          return (
            <li key={row.chain_id} className="rounded-lg bg-background/60 p-3">
              Chain {row.chain_id} · read {new Date(row.observed_at).toLocaleString()} · price{" "}
              {row.price_ok ? "fresh" : "unavailable"}
              {price ? ` · ${formatEthEquivalent(100, price)} ETH per $1` : ""}
              <div className="mt-1">
                Deposit treasury {depositEth} ETH · payout wallet {payoutEth} ETH
              </div>
              <div>
                Payout USDC {formatUsd(Math.floor(Number(row.payout_usdc_units) / 10_000))} ·
                deposit USDC {formatUsd(Math.floor(Number(row.deposit_usdc_units) / 10_000))}
              </div>
              <div>
                Payout key{" "}
                {row.hot_key_matches == null
                  ? "not checked"
                  : row.hot_key_matches
                    ? "matches"
                    : "does not match the payout wallet"}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type TreasuryRow = {
  network: string;
  asset_key: string;
  decimals: number;
  total_units: string | null;
  reserved_units: string;
  min_reserve_units: string;
  available_units: string | null;
  total_cents: number | null;
  reserved_cents: number | null;
  available_cents: number | null;
  observed_at: string | null;
  fresh: boolean;
};

function TreasuryLiquidity({ rows, onSaved }: { rows: TreasuryRow[]; onSaved: () => void }) {
  const save = useServerFn(setTreasuryMinReserve);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const units = (row: TreasuryRow, raw: string | null) =>
    raw == null ? "—" : formatCryptoUnits(raw, row.decimals, row.asset_key);
  const usd = (cents: number | null) => (cents == null ? "" : ` · ${formatUsd(Number(cents))}`);

  async function submit(row: TreasuryRow) {
    const parsed = decimalToUnits(value, row.decimals);
    if (parsed == null) {
      toast.error(`Enter an amount in ${row.asset_key}, for example 0.01.`);
      return;
    }
    const r = await save({
      data: { network: row.network, asset: row.asset_key, units: parsed.toString() },
    });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(`${row.asset_key} minimum reserve updated`);
    setEditing(null);
    onSaved();
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
        Withdrawal liquidity
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Payout wallets only. New withdrawals of an asset are refused when they would take its
        available balance below the minimum reserve. A reading older than 10 minutes closes the
        asset.
      </p>
      <ul className="mt-3 space-y-2 text-xs">
        {rows.length === 0 && <li className="text-muted-foreground">No treasury assets.</li>}
        {rows.map((row) => {
          const key = `${row.network}:${row.asset_key}`;
          return (
            <li key={key} className="rounded-lg bg-background/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <b>{row.asset_key}</b>
                <span className="text-muted-foreground">{row.network}</span>
                <span className={row.fresh ? "text-primary" : "text-destructive"}>
                  {row.fresh ? "open" : "closed — no fresh reading"}
                </span>
                {row.observed_at && (
                  <span className="text-muted-foreground">
                    read {new Date(row.observed_at).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="mt-1 grid gap-1 sm:grid-cols-2">
                <div>
                  Total {units(row, row.total_units)}
                  {usd(row.total_cents)}
                </div>
                <div>
                  Reserved {units(row, row.reserved_units)}
                  {usd(row.reserved_cents)}
                </div>
                <div>
                  Available {units(row, row.available_units)}
                  {usd(row.available_cents)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  Minimum reserve {units(row, row.min_reserve_units)}
                  {editing === key ? (
                    <>
                      <Input
                        className="h-7 w-28"
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        aria-label={`${row.asset_key} minimum reserve`}
                      />
                      <Button size="sm" className="h-7" onClick={() => void submit(row)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7"
                      onClick={() => {
                        setEditing(key);
                        setValue(
                          formatCryptoUnits(
                            row.min_reserve_units,
                            row.decimals,
                            row.asset_key,
                          ).split(" ")[0] ?? "0",
                        );
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BtcHotWalletTopup() {
  const load = useServerFn(getBtcHotWallet);
  const q = useQuery({
    queryKey: ["btc-hot-wallet"],
    queryFn: () => load(),
    refetchInterval: 20_000,
  });
  const view = q.data;
  if (!view) return null;
  const btc = (sats: string | null) =>
    sats == null ? "—" : formatCryptoUnits(sats, 8, "BTC");
  const usd = (cents: number | null) => (cents == null ? "—" : formatUsd(cents));

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
        Bitcoin payout float
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        When the deposit wallet holds $50 of confirmed Bitcoin, the surplus moves to the payout
        wallet. Five percent of Bitcoin received stays in the deposit wallet, plus the miner fee.
        One transfer is at most $1,000, and transfers in a day stop at $2,000.
      </p>
      <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
        <div>
          Deposit wallet {btc(view.depositSats)} · {usd(view.depositCents)}
        </div>
        <div>
          Payout wallet {btc(view.payoutSats)} · {usd(view.payoutCents)}
        </div>
        <div>Open Bitcoin cashouts {usd(view.pendingCents)}</div>
        <div>Paid in the last 24 hours {usd(view.demandCents)}</div>
        <div>Player balances {usd(view.owedCents)}</div>
        <div>Covered by ETH and USDC {usd(view.otherCoverCents)}</div>
      </div>
      {view.destination ? (
        <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
          Sends only to {view.destination}
        </p>
      ) : null}
      {view.reason ? <p className="mt-2 text-xs text-destructive">{view.reason}</p> : null}
      <h4 className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
        Automatic transfers
      </h4>
      {view.transfers.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">None yet.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs">
          {view.transfers.map((row) => (
            <li key={`${row.createdAt}-${row.sats}`} className="flex flex-wrap gap-x-3">
              <span>{new Date(row.createdAt).toLocaleString()}</span>
              <span>{formatUsd(row.usdCents)}</span>
              <span>{row.status}</span>
              {row.txid ? (
                <span className="font-mono text-muted-foreground">{row.txid.slice(0, 10)}…</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatWei(wei: string | number): string {
  const v = BigInt(String(wei ?? "0").split(".")[0] || "0");
  const whole = v / 10n ** 18n;
  const frac = (v % 10n ** 18n).toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}
