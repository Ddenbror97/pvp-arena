import { useEffect, useState, type ReactNode } from "react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatUsd } from "@/lib/jackpot/math";
import { AdminGate } from "@/components/admin/AdminGate";
import { CryptoAdmin } from "@/components/wallet/CryptoAdmin";
import { PromoAdmin } from "@/components/admin/PromoAdmin";
import { PartnersAdmin } from "@/components/admin/PartnersAdmin";
import { LeaderboardsAdmin } from "@/components/leaderboard/LeaderboardsAdmin";
import { LedgerCashflow } from "@/components/admin/LedgerCashflow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  adminErrorCopy,
  adminQuery,
  HEALTH_BANDS,
  healthLabel,
  workerAge,
  type AdminTab,
  type LiveHealth,
  type OverviewData,
  type Page,
  type RouletteNow,
} from "@/lib/admin/ops";

const NAV: { label: string; items: { id: AdminTab; label: string }[] }[] = [
  { label: "Home", items: [{ id: "overview", label: "Overview" }] },
  {
    label: "Games",
    items: [
      { id: "jackpot", label: "Jackpot" },
      { id: "coinflip", label: "Coinflip" },
      { id: "roulette", label: "Roulette" },
    ],
  },
  {
    label: "Money",
    items: [
      { id: "deposits", label: "Deposits" },
      { id: "withdrawals", label: "Withdrawals" },
      { id: "ledger", label: "Ledger" },
      { id: "crypto", label: "Crypto rails" },
    ],
  },
  {
    label: "Players",
    items: [
      { id: "signups", label: "Sign ups" },
      { id: "referrals", label: "Referrals" },
      { id: "partners", label: "Partners" },
      { id: "leaderboards", label: "Leaderboards" },
      { id: "promos", label: "Promo codes" },
      { id: "prestige", label: "Prestige" },
    ],
  },
  { label: "System", items: [{ id: "logs", label: "Server logs" }] },
];

const BLURB: Record<AdminTab, string> = {
  overview: "Worker health, then the areas that need a look.",
  jackpot: "Recent rounds, pots, and winners.",
  coinflip: "Open tables and settled flips.",
  roulette: "The live round and the rounds behind it.",
  deposits:
    "On-chain credited deposits (EVM + Bitcoin). Promos and card invoices are not listed here.",
  withdrawals: "Payouts from request through broadcast.",
  ledger: "Player balances, winnings credited, and whether payout wallets cover them.",
  crypto: "Switches, inventory, and items waiting on a decision.",
  signups: "New accounts, whether the email is confirmed, and the real balance.",
  referrals: "Invite progress and rewards.",
  partners: "Search an existing username or email, set the commission, then Make partner.",
  leaderboards: "Templates, campaign approval, funding checks, and payout exceptions.",
  promos: "Create codes and turn them on or off.",
  prestige: "XP, cosmetics, and recent awards.",
  logs: "Server actions, warnings, and failures.",
};

function sectionMeta(tab: AdminTab): { group: string; label: string } {
  for (const group of NAV) {
    const item = group.items.find((entry) => entry.id === tab);
    if (item) return { group: group.label, label: item.label };
  }
  return { group: "Home", label: "Overview" };
}

const control = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-[8.5rem] flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

const tone: Record<string, string> = {
  ok: "text-success",
  late: "text-gold",
  down: "text-destructive",
  unknown: "text-muted-foreground",
};

function badge(status: string) {
  const s = status.toUpperCase();
  const color = /COMPLETE|CREDIT|CONFIRM/.test(s)
    ? "bg-success/15 text-success"
    : /FAIL|REJECT|CANCEL|ERROR|ORPHAN|CRITICAL/.test(s)
      ? "bg-destructive/15 text-destructive"
      : /PEND|HELD|SUBMIT|LIQUID|DETECT|WAIT|ACTIVE|BET|LOCK|SPIN|READY|FLIP|DRAW|WARN|INFO/.test(s)
        ? "bg-gold/15 text-gold"
        : "bg-secondary text-muted-foreground";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", color)}>
      {status}
    </span>
  );
}

function when(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function shortId(id: string | null | undefined) {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function remaining(end: string | null, serverNow: number) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - serverNow;
  if (ms <= 0) return "0s";
  return `${Math.ceil(ms / 1000)}s`;
}

function ageText(age: number | null): string {
  if (age == null || age > 60 * 60 * 24 * 365) return "no run";
  return `${Math.round(age)}s ago`;
}

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("tabular mt-0.5 text-base font-semibold", warn && "text-destructive")}>
        {value}
      </div>
    </div>
  );
}

function LoadError({ section, error }: { section: string; error: unknown }) {
  return (
    <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
      {adminErrorCopy(section, error)}
    </p>
  );
}

function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background">{children}</div>
  );
}

function AdminDashboardInner() {
  const { profile, userId, signOut } = useAuth();
  const navigate = useNavigate();
  const tab = RouteSection();
  const [now, setNow] = useState(() => Date.now());
  const live = useQuery({
    queryKey: ["admin-live"],
    queryFn: () => adminQuery<LiveHealth>("live"),
    refetchInterval: 8_000,
    retry: false,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (live.error && adminErrorCopy("", live.error).startsWith("You don't")) {
    return <p className="p-6 text-sm text-muted-foreground">You don't have access to this page.</p>;
  }

  const skew = live.data ? Date.now() - new Date(live.data.server_time).getTime() : 0;
  const serverNow = now - skew;
  const gameStates = (["jackpot", "coinflip", "roulette"] as const).map((name) =>
    healthLabel(workerAge(live.data, name), HEALTH_BANDS[name]),
  );
  const worst = gameStates.includes("down")
    ? "down"
    : gameStates.includes("late")
      ? "late"
      : live.data
        ? "ok"
        : "unknown";
  const meta = sectionMeta(tab);
  const statusCopy = live.isError
    ? "Status unavailable"
    : worst === "ok"
      ? "Systems responding"
      : worst === "late"
        ? "A worker is late"
        : worst === "down"
          ? "A worker is stale"
          : "Checking status";
  const statusTone =
    worst === "ok"
      ? "bg-success/15 text-success"
      : worst === "late"
        ? "bg-gold/15 text-gold"
        : worst === "down"
          ? "bg-destructive/15 text-destructive"
          : "bg-secondary text-muted-foreground";

  const logFilter = adminRoute.useSearch().log;

  function open(next: AdminTab, opts?: { log?: string | undefined }) {
    void navigate({
      to: "/admin",
      search: { section: next, log: opts?.log },
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {meta.group}
          </p>
          <h1 className="font-display text-lg leading-tight">{meta.label}</h1>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusTone)}>
          {statusCopy}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {profile?.username ?? shortId(userId)}
          </span>
          <Link to="/profile" className="text-xs text-primary hover:underline">
            Profile
          </Link>
          <Button variant="secondary" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <AdminNav tab={tab} onChange={open} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminMobileNav tab={tab} onChange={open} />
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5">
            <p className="text-sm text-muted-foreground">{BLURB[tab]}</p>
            {tab === "overview" && (
              <Overview
                serverNow={serverNow}
                live={live.data}
                liveError={live.error}
                onOpen={(next) => open(next)}
                onOpenLogs={(action) => open("logs", { log: action })}
              />
            )}
            {tab === "jackpot" && <Games game="jackpot" />}
            {tab === "coinflip" && <Games game="coinflip" />}
            {tab === "roulette" && <Roulette serverNow={serverNow} live={live.data} />}
            {tab === "deposits" && <Money kind="deposits" />}
            {tab === "withdrawals" && <Money kind="withdrawals" />}
            {tab === "ledger" && <LedgerCashflow />}
            {tab === "crypto" && <CryptoAdmin />}
            {tab === "signups" && <Signups />}
            {tab === "referrals" && <Referrals />}
            {tab === "partners" && <PartnersAdmin />}
            {tab === "leaderboards" && <LeaderboardsAdmin />}
            {tab === "promos" && <PromoAdmin />}
            {tab === "prestige" && <PrestigeAdmin />}
            {tab === "logs" && <Logs initialSearch={logFilter} />}
          </div>
        </div>
      </div>
    </div>
  );
}

const adminRoute = getRouteApi("/_authenticated/admin");

function RouteSection(): AdminTab {
  const { section } = adminRoute.useSearch();
  return section;
}

function navButton(active: boolean) {
  return cn(
    "rounded-md px-2.5 py-1.5 text-left text-sm whitespace-nowrap",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-background hover:text-foreground",
  );
}

function AdminNav({ tab, onChange }: { tab: AdminTab; onChange: (id: AdminTab) => void }) {
  return (
    <nav
      aria-label="Admin sections"
      className="hidden w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-muted/20 p-3 md:flex"
    >
      {NAV.map((group) => (
        <div key={group.label}>
          <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {group.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => onChange(item.id)}
                className={navButton(tab === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AdminMobileNav({ tab, onChange }: { tab: AdminTab; onChange: (id: AdminTab) => void }) {
  return (
    <nav
      aria-label="Admin sections"
      className="flex shrink-0 gap-4 overflow-x-auto border-b border-border bg-muted/20 px-3 py-2 md:hidden"
    >
      {NAV.map((group) => (
        <div key={group.label} className="shrink-0">
          <div className="px-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {group.label}
          </div>
          <div className="mt-1 flex gap-1">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => onChange(item.id)}
                className={navButton(tab === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function useOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminQuery<OverviewData>("overview"),
    refetchInterval: 20_000,
    retry: false,
  });
}

function Overview({
  serverNow,
  live,
  liveError,
  onOpen,
  onOpenLogs,
}: {
  serverNow: number;
  live: LiveHealth | undefined;
  liveError: unknown;
  onOpen: (tab: AdminTab) => void;
  onOpenLogs: (action: string) => void;
}) {
  const q = useOverview();
  const d = q.data;
  const round = live?.roulette;
  const phaseEnd =
    round?.status === "BETTING"
      ? round.betting_ends_at
      : round?.status === "SPINNING"
        ? round.spin_end_at
        : null;
  const jobs: { name: string; label: string }[] = [
    { name: "jackpot", label: "Jackpot" },
    { name: "coinflip", label: "Coinflip" },
    { name: "roulette", label: "Roulette" },
    { name: "deposits", label: "Deposits" },
    { name: "withdrawals", label: "Withdrawals" },
    { name: "reconcile", label: "Reconcile" },
  ];
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card">
        <h3 className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          System health
        </h3>
        {liveError ? (
          <div className="p-3">
            <LoadError section="system health" error={liveError} />
          </div>
        ) : !live ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Loading health…</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            <li className="flex items-center justify-between gap-3 px-3 py-2">
              <span>Database</span>
              <span className={tone["ok"]}>responding</span>
            </li>
            {jobs.map((job) => {
              const age = workerAge(live, job.name);
              const band = HEALTH_BANDS[job.name];
              const state = band ? healthLabel(age, band) : healthLabel(age);
              return (
                <li key={job.name} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>{job.label}</span>
                  <span className={tone[state]}>{ageText(age)}</span>
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-3 px-3 py-2">
              <span>Integrity</span>
              <span
                className={
                  live.integrity && live.integrity.incidents_found > 0 ? tone["down"] : undefined
                }
              >
                {live.integrity?.finished_at
                  ? when(live.integrity.finished_at)
                  : live.integrity
                    ? "running"
                    : "no run"}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3 px-3 py-2">
              <span>Latest failure</span>
              {live.latest_failure ? (
                <button
                  type="button"
                  className={cn(
                    "max-w-[14rem] truncate text-right text-sm underline-offset-2 hover:underline",
                    tone["down"],
                  )}
                  title={`${live.latest_failure.game_type ?? "system"} · ${when(live.latest_failure.created_at)} — open in logs`}
                  onClick={() => onOpenLogs(live.latest_failure!.action)}
                >
                  {live.latest_failure.action}
                  {live.latest_failure.game_type ? ` (${live.latest_failure.game_type})` : ""}
                </button>
              ) : (
                <span className="text-muted-foreground">none</span>
              )}
            </li>
            {live.roulette_error && (
              <li className="flex items-center justify-between gap-3 px-3 py-2">
                <span>Roulette error</span>
                <span className={cn("max-w-[16rem] truncate", tone["down"])}>
                  {live.roulette_error}
                </span>
              </li>
            )}
          </ul>
        )}
      </section>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading overview…</p>
      ) : q.error || !d ? (
        <LoadError section="overview" error={q.error} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <JumpCard
            title="Jackpot"
            onOpen={() => onOpen("jackpot")}
            lines={[
              ["Active", String(d.jackpot.active)],
              ["Waiting", String(d.jackpot.waiting)],
              ["Today", String(d.jackpot.rounds_today)],
            ]}
          />
          <JumpCard
            title="Coinflip"
            onOpen={() => onOpen("coinflip")}
            lines={[
              ["Open wagers", formatUsd(Number(d.coinflip.open_wager))],
              ["Active", String(d.coinflip.active)],
              ["Today", String(d.coinflip.completed_today)],
            ]}
          />
          <JumpCard
            title="Roulette"
            onOpen={() => onOpen("roulette")}
            lines={[
              ["Round", round ? `#${round.id}` : "—"],
              ["Phase", round?.status ?? "—"],
              ["Time left", remaining(phaseEnd, serverNow)],
            ]}
          />
          <JumpCard
            title="Deposits"
            onOpen={() => onOpen("deposits")}
            lines={[
              ["Unmatched", String(d.deposits.unmatched)],
              ["Open invoices", String(d.deposits.open_invoices ?? 0)],
              ["Credited today", formatUsd(Number(d.deposits.today_cents))],
            ]}
          />
          <JumpCard
            title="Withdrawals"
            onOpen={() => onOpen("withdrawals")}
            lines={[
              ["Manual review", String(d.withdrawals.manual_review ?? 0)],
              ["Open", formatUsd(Number(d.withdrawals.open_cents ?? 0))],
              ["Bitcoin open", String(d.withdrawals.bitcoin_open ?? 0)],
            ]}
          />
          <JumpCard
            title="Crypto rails"
            onOpen={() => onOpen("crypto")}
            lines={[
              ["Deposit worker", ageText(workerAge(live, "deposits"))],
              ["Payout worker", ageText(workerAge(live, "withdrawals"))],
              ["Reconcile", ageText(workerAge(live, "reconcile"))],
            ]}
          />
        </div>
      )}
    </div>
  );
}

function JumpCard({
  title,
  lines,
  onOpen,
}: {
  title: string;
  lines: [string, string][];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-primary">Open</span>
      </div>
      <dl className="mt-2 space-y-1 text-xs">
        {lines.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular">{value}</dd>
          </div>
        ))}
      </dl>
    </button>
  );
}

function CountStrip({ children }: { children: ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{children}</div>;
}

function PrestigeAdmin() {
  const q = useQuery({
    queryKey: ["admin-prestige"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_prestige_summary" as never);
      if (error) throw error;
      return data as {
        xp_total: number;
        by_game: Record<string, number>;
        users_by_level: Record<string, number>;
        cosmetics_unlocked: number;
        rewards_claimed: number;
        usdc_cents: number;
        replays: number;
        recent: { id: string; source_game: string; xp_amount: number; created_at: string }[];
      };
    },
    refetchInterval: 20_000,
    retry: false,
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading prestige…</p>;
  if (q.error || !q.data) return <LoadError section="prestige" error={q.error} />;
  const d = q.data;
  return (
    <section className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="XP awarded" value={Number(d.xp_total).toLocaleString("en-US")} />
        <Stat
          label="Jackpot XP"
          value={Number(d.by_game?.["jackpot"] ?? 0).toLocaleString("en-US")}
        />
        <Stat
          label="Coinflip XP"
          value={Number(d.by_game?.["coinflip"] ?? 0).toLocaleString("en-US")}
        />
        <Stat
          label="Roulette XP"
          value={Number(d.by_game?.["roulette"] ?? 0).toLocaleString("en-US")}
        />
        <Stat label="Cosmetics unlocked" value={d.cosmetics_unlocked} />
        <Stat label="Rewards claimed" value={d.rewards_claimed} />
        <Stat label="USDC issued" value={formatUsd(Number(d.usdc_cents ?? 0))} />
        <Stat label="Replay attempts" value={d.replays} warn={Number(d.replays) > 0} />
        <Stat
          label="Players with XP"
          value={Object.values(d.users_by_level ?? {}).reduce((s, n) => s + Number(n), 0)}
        />
      </div>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {(d.recent ?? []).slice(0, 6).map((row) => (
          <li key={row.id}>
            {row.source_game} · {row.xp_amount} XP · {when(row.created_at)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Games({ game }: { game: "jackpot" | "coinflip" }) {
  const [status, setStatus] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [stack, setStack] = useState<(string | null)[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const q = useQuery({
    queryKey: ["admin-games", game, status, cursor],
    queryFn: () =>
      adminQuery<Page<Record<string, unknown>>>("games", {
        game,
        limit: 25,
        status: status || undefined,
        cursor: cursor ?? undefined,
      }),
    retry: false,
    placeholderData: (prev) => prev,
  });
  const detail = useQuery({
    queryKey: ["admin-game", game, picked],
    queryFn: () =>
      adminQuery<{ game: Record<string, unknown> | null }>("game", { game, id: picked }),
    enabled: picked != null,
    retry: false,
  });
  const overview = useOverview();
  const counts = overview.data;
  return (
    <section className="space-y-3">
      {game === "jackpot" && counts && (
        <CountStrip>
          <Stat label="Waiting" value={counts.jackpot.waiting} />
          <Stat label="Active" value={counts.jackpot.active} />
          <Stat label="Drawing" value={counts.jackpot.drawing} />
          <Stat label="Completed today" value={counts.jackpot.completed_today} />
          <Stat label="Cancelled today" value={counts.jackpot.cancelled_today} />
          <Stat label="Rounds today" value={counts.jackpot.rounds_today} />
        </CountStrip>
      )}
      {game === "coinflip" && counts && (
        <CountStrip>
          <Stat label="Waiting" value={counts.coinflip.waiting} />
          <Stat label="Active" value={counts.coinflip.active} />
          <Stat label="Completed today" value={counts.coinflip.completed_today} />
          <Stat label="Cancelled today" value={counts.coinflip.cancelled_today} />
          <Stat label="Open wagers" value={formatUsd(Number(counts.coinflip.open_wager))} />
        </CountStrip>
      )}
      <div className="max-w-xs">
        <Field label="Status">
          <select
            className={control}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCursor(null);
              setStack([]);
            }}
          >
            <option value="">Recent</option>
            {(game === "jackpot"
              ? ["WAITING", "ACTIVE", "DRAWING", "COMPLETED", "CANCELLED"]
              : ["WAITING", "READY", "FLIPPING", "SETTLEMENT", "COMPLETED", "CANCELLED"]
            ).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : q.error ? (
        <LoadError section={game} error={q.error} />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {(game === "jackpot"
                  ? [
                      "Game",
                      "Status",
                      "Players",
                      "Entries",
                      "Pot",
                      "Winner",
                      "Fee",
                      "Payout",
                      "Created",
                      "Completed",
                    ]
                  : [
                      "Game",
                      "Status",
                      "Creator",
                      "Opponent",
                      "Wager",
                      "Winner",
                      "Created",
                      "Joined",
                      "Completed",
                    ]
                ).map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(q.data?.rows ?? []).map((row) => (
                <tr
                  key={String(row["id"])}
                  className="cursor-pointer hover:bg-secondary/40"
                  onClick={() => setPicked(Number(row["id"]))}
                >
                  {game === "jackpot" ? (
                    <>
                      <td className="px-3 py-2 tabular">#{String(row["id"])}</td>
                      <td className="px-3 py-2">{badge(String(row["status"]))}</td>
                      <td className="px-3 py-2 tabular">{String(row["player_count"])}</td>
                      <td className="px-3 py-2 tabular">{String(row["entry_count"])}</td>
                      <td className="px-3 py-2 tabular">{formatUsd(Number(row["pot_amount"]))}</td>
                      <td className="px-3 py-2">{String(row["winner"] ?? "—")}</td>
                      <td className="px-3 py-2 tabular">
                        {row["fee"] == null ? "—" : formatUsd(Number(row["fee"]))}
                      </td>
                      <td className="px-3 py-2 tabular">
                        {row["payout_amount"] == null
                          ? "—"
                          : formatUsd(Number(row["payout_amount"]))}
                      </td>
                      <td className="px-3 py-2">{when(String(row["created_at"]))}</td>
                      <td className="px-3 py-2">
                        {when(row["completed_at"] ? String(row["completed_at"]) : null)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 tabular">#{String(row["id"])}</td>
                      <td className="px-3 py-2">{badge(String(row["status"]))}</td>
                      <td className="px-3 py-2">{String(row["creator"] ?? "—")}</td>
                      <td className="px-3 py-2">{String(row["opponent"] ?? "—")}</td>
                      <td className="px-3 py-2 tabular">{formatUsd(Number(row["wager"]))}</td>
                      <td className="px-3 py-2">{String(row["winner"] ?? "—")}</td>
                      <td className="px-3 py-2">{when(String(row["created_at"]))}</td>
                      <td className="px-3 py-2">
                        {when(row["joined_at"] ? String(row["joined_at"]) : null)}
                      </td>
                      <td className="px-3 py-2">
                        {when(row["completed_at"] ? String(row["completed_at"]) : null)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <Pager
        hasPrev={stack.length > 0}
        hasNext={!!q.data?.next}
        onPrev={() => {
          const prev = stack[stack.length - 1] ?? null;
          setStack((s) => s.slice(0, -1));
          setCursor(prev);
        }}
        onNext={() => {
          setStack((s) => [...s, cursor]);
          setCursor(String(q.data?.next));
        }}
      />
      {picked != null && (
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">#{picked}</span>
            <button type="button" className="text-muted-foreground" onClick={() => setPicked(null)}>
              Close
            </button>
          </div>
          {detail.isLoading ? (
            "Loading…"
          ) : detail.error ? (
            <LoadError section="game" error={detail.error} />
          ) : (
            <dl className="grid gap-1 sm:grid-cols-2">
              {Object.entries(detail.data?.game ?? {})
                .filter(([k]) => k !== "id")
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-3 border-b border-border/60 py-0.5"
                  >
                    <dt className="text-muted-foreground">{k.replaceAll("_", " ")}</dt>
                    <dd className="tabular text-right">{v == null ? "—" : String(v)}</dd>
                  </div>
                ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
}

function Roulette({ serverNow, live }: { serverNow: number; live: LiveHealth | undefined }) {
  const round: RouletteNow | null = live?.roulette ?? null;
  const phaseEnd =
    round?.status === "BETTING"
      ? round.betting_ends_at
      : round?.status === "SPINNING"
        ? round.spin_end_at
        : null;
  const overview = useOverview();
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Round" value={round ? `#${round.id}` : "none open"} />
        <Stat label="Phase" value={round?.status ?? "—"} />
        <Stat label="Bets" value={round?.bet_count ?? "—"} />
        <Stat label="Wagered" value={round ? formatUsd(Number(round.pot_amount)) : "—"} />
        <Stat label="Time left" value={remaining(phaseEnd, serverNow)} />
        <Stat
          label="Tick age"
          value={
            workerAge(live, "roulette") == null
              ? "no run"
              : `${Math.round(workerAge(live, "roulette")!)}s`
          }
        />
        <Stat label="Completed today" value={overview.data?.roulette.completed_today ?? "—"} />
        <Stat label="Cancelled today" value={overview.data?.roulette.cancelled_today ?? "—"} />
      </div>
      {round?.status === "COMPLETED" && (
        <p className="text-xs text-muted-foreground">
          Result {round.winning_color ?? "—"} · payout{" "}
          {round.total_payout == null ? "—" : formatUsd(Number(round.total_payout))}
        </p>
      )}
      <GamesTable game="roulette" />
    </div>
  );
}

function GamesTable({ game }: { game: "roulette" }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [stack, setStack] = useState<(string | null)[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const q = useQuery({
    queryKey: ["admin-games", game, cursor],
    queryFn: () =>
      adminQuery<Page<Record<string, unknown>>>("games", {
        game,
        limit: 25,
        cursor: cursor ?? undefined,
      }),
    retry: false,
    placeholderData: (prev) => prev,
  });
  const detail = useQuery({
    queryKey: ["admin-game", game, picked],
    queryFn: () =>
      adminQuery<{ game: Record<string, unknown> | null }>("game", { game, id: picked }),
    enabled: picked != null,
    retry: false,
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading rounds…</p>;
  if (q.error) return <LoadError section="roulette" error={q.error} />;
  return (
    <section className="space-y-3">
      <TableWrap>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              {[
                "Round",
                "Status",
                "Result",
                "Wagered",
                "Payout",
                "Bets",
                "Created",
                "Completed",
              ].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {q.data?.rows.map((row) => (
              <tr
                key={String(row["id"])}
                className="cursor-pointer hover:bg-secondary/40"
                onClick={() => setPicked(Number(row["id"]))}
              >
                <td className="px-3 py-2 tabular">#{String(row["id"])}</td>
                <td className="px-3 py-2">{badge(String(row["status"]))}</td>
                <td className="px-3 py-2">{String(row["result"] ?? "—")}</td>
                <td className="px-3 py-2 tabular">{formatUsd(Number(row["pot_amount"]))}</td>
                <td className="px-3 py-2 tabular">
                  {row["total_payout"] == null ? "—" : formatUsd(Number(row["total_payout"]))}
                </td>
                <td className="px-3 py-2 tabular">{String(row["bet_count"])}</td>
                <td className="px-3 py-2">{when(String(row["created_at"]))}</td>
                <td className="px-3 py-2">
                  {when(row["completed_at"] ? String(row["completed_at"]) : null)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <Pager
        hasPrev={stack.length > 0}
        hasNext={!!q.data?.next}
        onPrev={() => {
          const prev = stack[stack.length - 1] ?? null;
          setStack((s) => s.slice(0, -1));
          setCursor(prev);
        }}
        onNext={() => {
          setStack((s) => [...s, cursor]);
          setCursor(String(q.data?.next));
        }}
      />
      {picked != null && (
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          {detail.error ? (
            <LoadError section="round" error={detail.error} />
          ) : (
            <dl className="grid gap-1 sm:grid-cols-2">
              {Object.entries(detail.data?.game ?? {}).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-3 border-b border-border/60 py-0.5"
                >
                  <dt className="text-muted-foreground">{k.replaceAll("_", " ")}</dt>
                  <dd className="tabular max-w-[16rem] truncate text-right">
                    {v == null ? "—" : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
}

const DEPOSIT_STATUSES = [
  "DETECTED",
  "CONFIRMED",
  "UNMATCHED",
  "CREDITED",
  "REJECTED",
  "ORPHANED",
  "NEW",
  "PROCESSING",
  "SETTLED",
  "EXPIRED",
  "INVALID",
  "REVIEW",
  "WAITING",
  "FAILED",
];
const WITHDRAWAL_STATUSES = [
  "PENDING",
  "HELD",
  "APPROVED",
  "LIQUIDITY_PENDING",
  "SUBMITTING",
  "SUBMITTED",
  "CONFIRMED",
  "FAILED",
  "REJECTED",
  "RELEASED",
  "HOLD",
  "AWAITING_APPROVAL",
  "QUEUED",
  "COMPLETED",
  "CANCELLED",
];

function Money({ kind }: { kind: "deposits" | "withdrawals" }) {
  const [status, setStatus] = useState(kind === "deposits" ? "CREDITED" : "");
  const [asset, setAsset] = useState("");
  const [assetOn, setAssetOn] = useState("");
  const [rail, setRail] = useState("");
  const [railOn, setRailOn] = useState("");
  const [chain, setChain] = useState("");
  const [chainOn, setChainOn] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromOn, setFromOn] = useState("");
  const [toOn, setToOn] = useState("");
  const [qtext, setQtext] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<{ id: string; created_at: string } | null>(null);
  const [stack, setStack] = useState<({ id: string; created_at: string } | null)[]>([]);
  const [picked, setPicked] = useState<{ id: string; rail: string } | null>(null);
  const query = useQuery({
    queryKey: [
      "admin-money",
      kind,
      status,
      assetOn,
      railOn,
      chainOn,
      fromOn,
      toOn,
      search,
      cursor?.id ?? null,
    ],
    queryFn: () =>
      adminQuery<Page<Record<string, unknown>>>(kind, {
        limit: 25,
        status: status || undefined,
        asset: assetOn || undefined,
        rail: railOn || undefined,
        chain: chainOn || undefined,
        from: fromOn ? `${fromOn}T00:00:00Z` : undefined,
        to: toOn ? `${toOn}T23:59:59Z` : undefined,
        q: search || undefined,
        cursor: cursor?.id,
        cursor_at: cursor?.created_at,
      }),
    refetchInterval: 20_000,
    retry: false,
    placeholderData: (prev) => prev,
  });
  const detail = useQuery({
    queryKey: ["admin-withdrawal", picked?.id, picked?.rail],
    queryFn: () =>
      adminQuery<{ withdrawal: Record<string, unknown> | null }>("withdrawal", {
        id: picked?.id,
        rail: picked?.rail,
      }),
    enabled: kind === "withdrawals" && !!picked,
    retry: false,
  });
  const statuses = kind === "deposits" ? DEPOSIT_STATUSES : WITHDRAWAL_STATUSES;
  const next = query.data?.next && typeof query.data.next === "object" ? query.data.next : null;
  const overview = useOverview();
  const counts = overview.data;
  return (
    <section className="space-y-3">
      {kind === "deposits" && counts?.money_epoch && (
        <p className="text-xs text-muted-foreground">
          Admin history since {when(counts.money_epoch)} (player balances unchanged).
        </p>
      )}
      {kind === "deposits" && counts && (
        <CountStrip>
          <Stat label="Detected" value={counts.deposits.pending} />
          <Stat label="Confirming" value={counts.deposits.confirming} />
          <Stat label="Unmatched" value={counts.deposits.unmatched} />
          <Stat label="Open invoices" value={counts.deposits.open_invoices ?? 0} />
          <Stat label="Failed today" value={counts.deposits.failed_today} />
          <Stat label="Today" value={counts.deposits.today_count} />
          <Stat label="Credited today" value={formatUsd(Number(counts.deposits.today_cents))} />
        </CountStrip>
      )}
      {kind === "withdrawals" && counts?.money_epoch && (
        <p className="text-xs text-muted-foreground">
          Admin history since {when(counts.money_epoch)} (player balances unchanged).
        </p>
      )}
      {kind === "withdrawals" && counts && (
        <CountStrip>
          <Stat label="Requested" value={counts.withdrawals.requested ?? 0} />
          <Stat label="Manual review" value={counts.withdrawals.manual_review ?? 0} />
          <Stat label="Funds locked" value={counts.withdrawals.funds_locked ?? 0} />
          <Stat label="Approved" value={counts.withdrawals.approved ?? 0} />
          <Stat label="Queued" value={counts.withdrawals.queued ?? 0} />
          <Stat label="Signing" value={counts.withdrawals.signing ?? 0} />
          <Stat label="Broadcast" value={counts.withdrawals.broadcast ?? 0} />
          <Stat label="Completed today" value={counts.withdrawals.completed_today} />
          <Stat
            label="Completed"
            value={formatUsd(Number(counts.withdrawals.completed_today_cents))}
          />
          <Stat label="Failed today" value={counts.withdrawals.failed_today} />
          <Stat label="Cancelled today" value={counts.withdrawals.cancelled_today} />
          <Stat label="Open" value={formatUsd(Number(counts.withdrawals.open_cents ?? 0))} />
          <Stat label="Bitcoin open" value={counts.withdrawals.bitcoin_open ?? 0} />
        </CountStrip>
      )}
      <p className="text-xs text-muted-foreground">
        {kind === "deposits"
          ? "Real-money rails only: EVM (Base) and Bitcoin. Default is credited. Promos never appear in this table."
          : "Settled and open amounts match the ledger across EVM and Bitcoin."}
      </p>
      <form
        className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(qtext.trim());
          setAssetOn(asset.trim());
          setRailOn(rail);
          setChainOn(chain);
          setFromOn(from);
          setToOn(to);
          setCursor(null);
          setStack([]);
        }}
      >
        <Field label="Status">
          <select
            className={control}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCursor(null);
            }}
          >
            {kind === "deposits" ? (
              <>
                <option value="CREDITED">Credited (finished)</option>
                <option value="CONFIRMED">Confirmed on-chain</option>
                <option value="">All statuses</option>
                {statuses
                  .filter((s) => s !== "CREDITED" && s !== "CONFIRMED")
                  .map((s) => (
                    <option key={s}>{s}</option>
                  ))}
              </>
            ) : (
              <>
                <option value="">Any</option>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </>
            )}
          </select>
        </Field>
        <Field label="Rail">
          <select
            className={control}
            value={rail}
            onChange={(e) => {
              setRail(e.target.value);
              setRailOn(e.target.value);
              setCursor(null);
              setStack([]);
            }}
          >
            <option value="">Any</option>
            <option value="evm">EVM</option>
            <option value="bitcoin">Bitcoin</option>
          </select>
        </Field>
        <Field label="Asset">
          <input
            className={control}
            value={asset}
            onChange={(e) => setAsset(e.target.value.toUpperCase())}
            placeholder="ETH, BTC"
          />
        </Field>
        <Field label="Network">
          <select className={control} value={chain} onChange={(e) => setChain(e.target.value)}>
            <option value="">Any</option>
            <option value="8453">Base</option>
          </select>
        </Field>
        <Field label="From">
          <input
            type="date"
            className={control}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            className={control}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <Field label="Search">
          <input
            className={control}
            value={qtext}
            onChange={(e) => setQtext(e.target.value)}
            placeholder="id or tx hash"
          />
        </Field>
        <div className="flex items-end">
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </div>
      </form>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.error ? (
        <LoadError section={kind} error={query.error} />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {(kind === "deposits"
                  ? [
                      "Id",
                      "User",
                      "Rail",
                      "Asset",
                      "Network",
                      "Amount",
                      "USD",
                      "Status",
                      "Tx",
                      "Created",
                      "Confirmed",
                    ]
                  : [
                      "Id",
                      "User",
                      "Rail",
                      "Asset",
                      "Network",
                      "USD",
                      "Units",
                      "Status",
                      "Review",
                      "Tx",
                      "Created",
                    ]
                ).map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(query.data?.rows.length ?? 0) === 0 && (
                <tr>
                  <td className="px-3 py-2 text-muted-foreground" colSpan={11}>
                    {kind === "deposits"
                      ? "No deposits match this view."
                      : "No withdrawals match this view."}
                  </td>
                </tr>
              )}
              {query.data?.rows.map((row) => (
                <tr
                  key={String(row["id"])}
                  className={
                    kind === "withdrawals" ? "cursor-pointer hover:bg-secondary/40" : undefined
                  }
                  onClick={() =>
                    kind === "withdrawals" &&
                    setPicked({ id: String(row["id"]), rail: String(row["rail"] ?? "evm") })
                  }
                >
                  <td className="px-3 py-2 font-mono">{shortId(String(row["id"]))}</td>
                  <td className="px-3 py-2">
                    {String(row["username"] ?? shortId(String(row["user_id"] ?? "")))}
                  </td>
                  <td className="px-3 py-2">{String(row["rail"] ?? "evm")}</td>
                  <td className="px-3 py-2">{String(row["asset_key"])}</td>
                  <td className="px-3 py-2">{String(row["network"] ?? row["chain_id"])}</td>
                  {kind === "deposits" && (
                    <td className="px-3 py-2 font-mono">{String(row["units"])}</td>
                  )}
                  <td className="px-3 py-2 tabular">{formatUsd(Number(row["usd_cents"]))}</td>
                  {kind === "withdrawals" && (
                    <td className="px-3 py-2 font-mono">{String(row["units"])}</td>
                  )}
                  <td className="px-3 py-2">{badge(String(row["status"]))}</td>
                  {kind === "withdrawals" && (
                    <td className="px-3 py-2">{row["review_required"] ? "review" : "—"}</td>
                  )}
                  <td className="px-3 py-2 font-mono">
                    {row["tx_hash"] ? `${String(row["tx_hash"]).slice(0, 10)}…` : "—"}
                  </td>
                  <td className="px-3 py-2">{when(String(row["created_at"]))}</td>
                  {kind === "deposits" && (
                    <td className="px-3 py-2">
                      {when(row["confirmed_at"] ? String(row["confirmed_at"]) : null)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <Pager
        hasPrev={stack.length > 0}
        hasNext={!!next}
        onPrev={() => {
          const prev = stack[stack.length - 1] ?? null;
          setStack((s) => s.slice(0, -1));
          setCursor(prev);
        }}
        onNext={() => {
          if (!next) return;
          setStack((s) => [...s, cursor]);
          setCursor(next);
        }}
      />
      {kind === "withdrawals" && picked && (
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          <div className="mb-2 flex justify-between">
            <span className="font-medium">Withdrawal</span>
            <button type="button" onClick={() => setPicked(null)} className="text-muted-foreground">
              Close
            </button>
          </div>
          {detail.isLoading ? (
            "Loading…"
          ) : detail.error ? (
            <LoadError section="withdrawal" error={detail.error} />
          ) : (
            <>
              <dl className="grid gap-1 sm:grid-cols-2">
                {Object.entries(detail.data?.withdrawal ?? {}).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-3 border-b border-border/60 py-0.5"
                  >
                    <dt className="text-muted-foreground">{k.replaceAll("_", " ")}</dt>
                    <dd className="tabular max-w-[16rem] truncate text-right">
                      {v == null ? "—" : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
              <ol className="mt-3 space-y-1 text-muted-foreground">
                {["created_at", "reviewed_at", "submitted_at", "confirmed_at", "closed_at"].map(
                  (k) => {
                    const v = detail.data?.withdrawal?.[k];
                    return v ? (
                      <li key={k}>
                        {k.replace("_at", "").replaceAll("_", " ")} · {when(String(v))}
                      </li>
                    ) : null;
                  },
                )}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  );
}

type ReferralAdminRow = {
  id: string;
  inviter_user_id: string;
  referred_user_id: string;
  status: string;
  qualifying_deposit_cents: number;
  qualifying_play_cents: number;
  reward_cents: number;
  reward_status: string | null;
  qualified_at: string | null;
  rewarded_at: string | null;
  created_at: string;
};

interface SignupRow {
  id: string;
  username: string | null;
  email: string | null;
  created_at: string;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
  balance_cents: number | string;
}

interface SignupPage {
  today: number;
  week: number;
  month: number;
  total: number;
  pending: number;
  rows: SignupRow[];
  next: { id: string; created_at: string } | null;
}

function Signups() {
  const [range, setRange] = useState("all");
  const [qtext, setQtext] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<{ id: string; created_at: string } | null>(null);
  const [stack, setStack] = useState<({ id: string; created_at: string } | null)[]>([]);
  const q = useQuery({
    queryKey: ["admin-signups", range, search, cursor?.id ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "admin_signups" as never,
        {
          p_args: {
            limit: 25,
            range,
            q: search || undefined,
            cursor: cursor?.id,
            cursor_at: cursor?.created_at,
          },
        } as never,
      );
      if (error) throw error;
      return data as SignupPage;
    },
    retry: false,
    placeholderData: (prev) => prev,
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading sign-ups…</p>;
  if (q.error) return <LoadError section="sign-ups" error={q.error} />;
  const page = q.data;
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Today" value={page?.today ?? 0} />
        <Stat label="7 days" value={page?.week ?? 0} />
        <Stat label="30 days" value={page?.month ?? 0} />
        <Stat label="All accounts" value={page?.total ?? 0} />
        <Stat label="Email pending" value={page?.pending ?? 0} warn={(page?.pending ?? 0) > 0} />
      </div>
      <form
        className="flex flex-wrap gap-3 rounded-lg border border-border bg-muted/20 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(qtext.trim());
          setCursor(null);
          setStack([]);
        }}
      >
        <Field label="Signed up">
          <select
            className={control}
            value={range}
            onChange={(e) => {
              setRange(e.target.value);
              setCursor(null);
              setStack([]);
            }}
          >
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </Field>
        <Field label="Username or email">
          <input
            className={control}
            value={qtext}
            onChange={(e) => setQtext(e.target.value)}
            placeholder="Search"
          />
        </Field>
        <div className="flex items-end">
          <Button type="submit" size="sm">
            Search
          </Button>
        </div>
      </form>
      <TableWrap>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2">Signed up</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last sign-in</th>
              <th className="px-3 py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {(page?.rows ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2 whitespace-nowrap">{when(row.created_at)}</td>
                <td className="px-3 py-2">{row.username ?? "—"}</td>
                <td className="px-3 py-2">{row.email ?? "—"}</td>
                <td className="px-3 py-2">{badge(row.confirmed_at ? "CONFIRMED" : "PENDING")}</td>
                <td className="px-3 py-2 whitespace-nowrap">{when(row.last_sign_in_at)}</td>
                <td className="px-3 py-2 tabular">{formatUsd(BigInt(row.balance_cents))}</td>
              </tr>
            ))}
            {(page?.rows ?? []).length === 0 && (
              <tr>
                <td className="px-3 py-2 text-muted-foreground" colSpan={6}>
                  No sign-ups in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
      <Pager
        hasPrev={stack.length > 0}
        hasNext={!!page?.next}
        onPrev={() => {
          const prev = stack[stack.length - 1] ?? null;
          setStack((s) => s.slice(0, -1));
          setCursor(prev);
        }}
        onNext={() => {
          if (!page?.next) return;
          setStack((s) => [...s, cursor]);
          setCursor(page.next);
        }}
      />
    </section>
  );
}

function Referrals() {
  const q = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_referrals" as never);
      if (error) throw error;
      return data as { rows: ReferralAdminRow[] };
    },
    retry: false,
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading referrals…</p>;
  if (q.error) return <LoadError section="referrals" error={q.error} />;
  return (
    <TableWrap>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
            <th className="px-3 py-2">Referral</th>
            <th className="px-3 py-2">Inviter</th>
            <th className="px-3 py-2">Referred</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Deposit</th>
            <th className="px-3 py-2">Play</th>
            <th className="px-3 py-2">Reward</th>
            <th className="px-3 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {(q.data?.rows ?? []).map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-3 py-2 font-mono">{shortId(row.id)}</td>
              <td className="px-3 py-2 font-mono">{shortId(row.inviter_user_id)}</td>
              <td className="px-3 py-2 font-mono">{shortId(row.referred_user_id)}</td>
              <td className="px-3 py-2">{badge(row.status)}</td>
              <td className="px-3 py-2 tabular">{formatUsd(row.qualifying_deposit_cents)}</td>
              <td className="px-3 py-2 tabular">{formatUsd(row.qualifying_play_cents)}</td>
              <td className="px-3 py-2">
                {row.reward_status ?? "—"} {formatUsd(row.reward_cents)}
              </td>
              <td className="px-3 py-2">{when(row.created_at)}</td>
            </tr>
          ))}
          {(q.data?.rows ?? []).length === 0 && (
            <tr>
              <td className="px-3 py-2 text-muted-foreground" colSpan={8}>
                No referrals.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </TableWrap>
  );
}

function Logs({ initialSearch }: { initialSearch?: string | undefined }) {
  const [severity, setSeverity] = useState("");
  const [game, setGame] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [qtext, setQtext] = useState(initialSearch ?? "");
  const [search, setSearch] = useState(initialSearch ?? "");
  const [cursor, setCursor] = useState<string | null>(null);
  const [stack, setStack] = useState<(string | null)[]>([]);
  useEffect(() => {
    if (!initialSearch) return;
    setQtext(initialSearch);
    setSearch(initialSearch);
    setCursor(null);
    setStack([]);
  }, [initialSearch]);
  const q = useQuery({
    queryKey: ["admin-logs", severity, game, from, to, search, cursor],
    queryFn: () =>
      adminQuery<Page<Record<string, unknown>>>("logs", {
        limit: 40,
        severity: severity || undefined,
        game: game || undefined,
        from: from ? `${from}T00:00:00Z` : undefined,
        to: to ? `${to}T23:59:59Z` : undefined,
        q: search || undefined,
        cursor: cursor ?? undefined,
      }),
    refetchInterval: 60_000,
    retry: false,
    placeholderData: (prev) => prev,
  });
  return (
    <section className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Search matches action names (e.g.{" "}
        <button
          type="button"
          className="text-primary underline-offset-2 hover:underline"
          onClick={() => {
            setQtext("RECOVERY_FAILED");
            setSearch("RECOVERY_FAILED");
            setCursor(null);
            setStack([]);
          }}
        >
          RECOVERY_FAILED
        </button>
        ) from overview.
      </p>
      <form
        className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(qtext.trim());
          setCursor(null);
          setStack([]);
        }}
      >
        <Field label="Level">
          <select
            className={control}
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setCursor(null);
            }}
          >
            <option value="">Any</option>
            {["INFO", "WARNING", "ERROR", "CRITICAL"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Game">
          <select
            className={control}
            value={game}
            onChange={(e) => {
              setGame(e.target.value);
              setCursor(null);
            }}
          >
            <option value="">Any</option>
            {["jackpot", "coinflip", "roulette"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input
            type="date"
            className={control}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            className={control}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <Field label="Search">
          <input className={control} value={qtext} onChange={(e) => setQtext(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </div>
      </form>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading logs…</p>
      ) : q.error ? (
        <LoadError section="server logs" error={q.error} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card text-xs">
          {(q.data?.rows ?? []).map((row) => (
            <li
              key={String(row["id"])}
              className="grid gap-1 px-3 py-2 sm:grid-cols-[9rem_5rem_7rem_1fr]"
            >
              <span className="text-muted-foreground">{when(String(row["created_at"]))}</span>
              <span>{badge(String(row["severity"]))}</span>
              <span className="truncate">
                {String(row["game_type"])}
                {row["game_id"] ? ` #${row["game_id"]}` : ""}
              </span>
              <span className="min-w-0">
                <span className="font-medium">{String(row["action"])}</span>
                <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                  {JSON.stringify(row["details"])}
                </span>
              </span>
            </li>
          ))}
          {q.data?.rows.length === 0 && (
            <li className="px-3 py-2 text-muted-foreground">No log rows.</li>
          )}
        </ul>
      )}
      <Pager
        hasPrev={stack.length > 0}
        hasNext={!!q.data?.next}
        onPrev={() => {
          const prev = stack[stack.length - 1] ?? null;
          setStack((s) => s.slice(0, -1));
          setCursor(prev);
        }}
        onNext={() => {
          setStack((s) => [...s, cursor]);
          setCursor(String(q.data?.next));
        }}
      />
    </section>
  );
}

export function AdminDashboard() {
  return (
    <AdminGate>
      <AdminDashboardInner />
    </AdminGate>
  );
}

function Pager({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="secondary" disabled={!hasPrev} onClick={onPrev}>
        Previous
      </Button>
      <Button type="button" size="sm" variant="secondary" disabled={!hasNext} onClick={onNext}>
        Next
      </Button>
    </div>
  );
}
