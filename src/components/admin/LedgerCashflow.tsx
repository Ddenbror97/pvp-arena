import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatUsd } from "@/lib/jackpot/math";
import { adminErrorCopy } from "@/lib/admin/ops";
import { cn } from "@/lib/utils";

type MoneyRow = { today: number; all_time: number };
type WinRow = MoneyRow & { game: string };
type CreditRow = MoneyRow & { kind: string };
type WalletRow = {
  network: string;
  asset: string;
  total_cents: number | null;
  reserved_cents: number | null;
  available_cents: number | null;
  fresh: boolean;
  observed_at: string | null;
};

export type LedgerCashflowData = {
  balances: {
    player_available: number;
    player_locked: number;
    game_escrow: number;
    player_owed: number;
    partner_play?: number;
    house_revenue: number;
    house_bankroll: number;
    custody_net: number;
    books_balance: boolean;
  };
  deposits: MoneyRow;
  withdrawals: {
    paid_today: number;
    paid_all_time: number;
    fees_today: number;
    fees_all_time: number;
    open_cents: number;
    open_count: number;
  };
  winnings: WinRow[];
  fees: MoneyRow;
  credits: CreditRow[];
  wallets: WalletRow[];
  wallets_fresh_cents: number;
  wallets_stale: boolean;
  stat_epoch?: string;
};

function money(cents: number | null | undefined) {
  if (cents == null) return "—";
  return formatUsd(cents);
}

function networkName(network: string) {
  if (network === "bitcoin") return "Bitcoin";
  if (network === "eip155:8453") return "Base";
  if (network === "eip155:1") return "Ethereum";
  return network;
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("tabular mt-0.5 text-base font-semibold", warn && "text-destructive")}>
        {value}
      </div>
    </div>
  );
}

export function LedgerCashflow() {
  const q = useQuery({
    queryKey: ["admin-ledger-cashflow"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_ledger_cashflow" as never);
      if (error) throw error;
      return data as LedgerCashflowData;
    },
    refetchInterval: 20_000,
    retry: false,
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading ledger…</p>;
  if (q.error || !q.data)
    return (
      <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
        {adminErrorCopy("ledger", q.error)}
      </p>
    );

  const d = q.data;
  const owed = Number(d.balances.player_owed);
  const wallets = Number(d.wallets_fresh_cents);
  const cover = wallets - owed;
  const coverKnown = !d.wallets_stale;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground">
          What players are owed
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Available to withdraw" value={money(d.balances.player_available)} />
          <Stat label="Locked" value={money(d.balances.player_locked)} />
          <Stat label="In open games" value={money(d.balances.game_escrow)} />
          <Stat label="Owed by the wallets" value={money(owed)} />
          <Stat label="Partner play" value={money(d.balances.partner_play ?? 0)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Payout wallets"
            value={coverKnown ? money(wallets) : "Reading stale"}
            warn={!coverKnown}
          />
          <Stat
            label={coverKnown ? (cover >= 0 ? "Wallet surplus" : "Wallet shortfall") : "Cover"}
            value={coverKnown ? money(cover) : "Wait for a fresh reading"}
            warn={coverKnown && cover < 0}
          />
          <Stat
            label="Open withdrawals"
            value={`${money(d.withdrawals.open_cents)} · ${d.withdrawals.open_count}`}
            warn={Number(d.withdrawals.open_count) > 0}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Owed by the wallets is spendable balances, withdrawal holds, and pots still in play.
          Partner play is promotional credit. It stays off that cover because partners cannot
          withdraw it. Payout wallets are the latest fresh on-chain readings. Open withdrawals are
          already inside Locked and already reserved in those wallets.
          {d.balances.books_balance
            ? " The ledger books balance."
            : " The ledger books do not balance. Check integrity before moving funds."}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Cash in and cash out
        </h3>
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Flow</th>
                <th className="px-3 py-2 font-medium">Today (UTC)</th>
                <th className="px-3 py-2 font-medium">Since launch</th>
              </tr>
            </thead>
            <tbody className="tabular">
              <tr className="border-t border-border">
                <td className="px-3 py-2">Deposits credited</td>
                <td className="px-3 py-2">{money(d.deposits.today)}</td>
                <td className="px-3 py-2">{money(d.deposits.all_time)}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2">Withdrawals paid</td>
                <td className="px-3 py-2">{money(d.withdrawals.paid_today)}</td>
                <td className="px-3 py-2">{money(d.withdrawals.paid_all_time)}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2">Withdrawal fees kept</td>
                <td className="px-3 py-2">{money(d.withdrawals.fees_today)}</td>
                <td className="px-3 py-2">{money(d.withdrawals.fees_all_time)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Winnings credited
        </h3>
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Game</th>
                <th className="px-3 py-2 font-medium">Today (UTC)</th>
                <th className="px-3 py-2 font-medium">Since launch</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {d.winnings.map((row) => (
                <tr key={row.game} className="border-t border-border">
                  <td className="px-3 py-2">{row.game}</td>
                  <td className="px-3 py-2">{money(row.today)}</td>
                  <td className="px-3 py-2">{money(row.all_time)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-medium">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2">
                  {money(d.winnings.reduce((s, row) => s + Number(row.today), 0))}
                </td>
                <td className="px-3 py-2">
                  {money(d.winnings.reduce((s, row) => s + Number(row.all_time), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          A winning credit is the amount posted to a player's available balance. Jackpot, Coinflip,
          and Slott pay the pot minus the fee. Roulette pays the wheel multiplier minus the win fee.
          Slott bonus is the house-funded award on top of the pot.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground">
          House position
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Fees kept today" value={money(d.fees.today)} />
          <Stat label="Fees since launch" value={money(d.fees.all_time)} />
          <Stat label="Revenue account" value={money(d.balances.house_revenue)} />
          <Stat
            label="House bankroll"
            value={money(d.balances.house_bankroll)}
            warn={Number(d.balances.house_bankroll) < 0}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Fees since launch start at the reset. The revenue account and house bankroll are the
          ledger balances, so they still include play from before that reset.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Other credits to players</th>
                <th className="px-3 py-2 font-medium">Today (UTC)</th>
                <th className="px-3 py-2 font-medium">Since launch</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {d.credits.map((row) => (
                <tr key={row.kind} className="border-t border-border">
                  <td className="px-3 py-2">{row.kind}</td>
                  <td className="px-3 py-2">{money(row.today)}</td>
                  <td className="px-3 py-2">{money(row.all_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Payout wallet inventory
        </h3>
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Wallet</th>
                <th className="px-3 py-2 font-medium">On hand</th>
                <th className="px-3 py-2 font-medium">Reserved</th>
                <th className="px-3 py-2 font-medium">Free for a new payout</th>
                <th className="px-3 py-2 font-medium">Reading</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {d.wallets.length === 0 && (
                <tr className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground" colSpan={5}>
                    No treasury reading yet.
                  </td>
                </tr>
              )}
              {d.wallets.map((row) => (
                <tr key={`${row.network}-${row.asset}`} className="border-t border-border">
                  <td className="px-3 py-2">
                    {networkName(row.network)} {row.asset}
                  </td>
                  <td className="px-3 py-2">{money(row.total_cents)}</td>
                  <td className="px-3 py-2">{money(row.reserved_cents)}</td>
                  <td
                    className={cn(
                      "px-3 py-2",
                      row.available_cents != null && row.available_cents < 0 && "text-destructive",
                    )}
                  >
                    {money(row.available_cents)}
                  </td>
                  <td className={cn("px-3 py-2", !row.fresh && "text-destructive")}>
                    {row.fresh ? "Fresh" : "Stale"}
                    {row.observed_at ? ` · ${new Date(row.observed_at).toLocaleString()}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
