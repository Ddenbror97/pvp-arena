import { Fragment, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import { adminErrorCopy } from "@/lib/admin/ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Window = {
  deposit_cents: number;
  deposit_count: number;
  depositing_users: number;
  commission_cents: number;
};
type ListRow = {
  user_id: string;
  username: string;
  active: boolean;
  leaderboard: boolean;
  commission_bps: number;
  codes: string[];
  attributed_users: number;
  credits_cents: number;
  balance_cents: number;
  period: Window;
  created_at: string;
};
type ListData = { rows: ListRow[]; settings: { min_topup_cents: number; max_topup_cents: number } };
type Detail = {
  user_id: string;
  username: string;
  email: string | null;
  active: boolean;
  leaderboard: boolean;
  commission_bps: number;
  note: string | null;
  created_at: string;
  removed_at: string | null;
  withdrawal: "blocked" | "held" | "normal";
  held_cents: number | null;
  available_cents: number;
  locked_cents: number;
  credits_cents: number;
  attributed_users: number;
  codes: {
    id: string;
    code: string;
    reward_cents: number;
    max_claims: number;
    claim_count: number;
    expires_at: string | null;
    active: boolean;
    attributed_users: number;
  }[];
  topups: {
    id: string;
    amount_cents: number;
    note: string | null;
    created_at: string;
    admin: string | null;
  }[];
  windows: { d7: Window; d30: Window; d90: Window; all: Window; range: Window };
  users: {
    user_id: string;
    username: string;
    code: string;
    attributed_at: string;
    range_cents: number;
    range_deposits: number;
    all_cents: number;
  }[];
};
type SearchRow = { user_id: string; username: string; email: string | null; is_partner: boolean };

type Preset = "d7" | "d30" | "d90" | "all" | "custom";
type Range = { preset: Preset; from: string | null; to: string | null };

const ERRORS: Record<string, string> = {
  FORBIDDEN: "Admins only.",
  USER_NOT_FOUND: "That user no longer exists.",
  BAD_COMMISSION: "Commission must be between 0% and 100%.",
  BAD_NOTE: "That note is too long.",
  PARTNER_HAS_PENDING_WITHDRAWAL:
    "This user has a withdrawal in progress. Wait for it to finish first.",
  PARTNER_HAS_OPEN_GAMES: "This partner has money in an open game. Try again once it settles.",
  NOT_PARTNER: "This user is not an active partner.",
  BAD_AMOUNT: "Amount is outside the allowed top-up range.",
  REQUEST_REUSED: "That request was already used for a different amount. Try again.",
  NO_WALLET: "This account has no wallet yet.",
  BAD_CODE: "Codes are 4–16 letters or digits.",
  CODE_TAKEN: "That code already exists.",
  CODE_USED: "That code has already been claimed, so it cannot be deleted. Disable it instead.",
  BAD_REWARD: "Reward must be between $1.00 and $5.00.",
  BAD_CLAIMS: "Max claims must be between 1 and 100,000.",
  BAD_EXPIRY: "Expiry must be in the future.",
  BAD_RANGE: "The start date must be before the end date.",
  BAD_REASON: "Add a reason (3–500 characters).",
  NOTHING_HELD: "Nothing is held for this player anymore.",
  SESSION_REVOKED: "Your session ended. Sign in again.",
  SESSION_EXPIRED: "Your session ended. Sign in again.",
};
function errorCopy(error: { message?: string } | null, fallback: string) {
  const msg = error?.message ?? "";
  const key = Object.keys(ERRORS).find((k) => msg.includes(k));
  return key ? ERRORS[key] : fallback;
}

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as T;
}

const control = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";
const pct = (bps: number) =>
  `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : "—");
const PRESETS: { id: Preset; label: string; days: number | null }[] = [
  { id: "d7", label: "7 days", days: 7 },
  { id: "d30", label: "30 days", days: 30 },
  { id: "d90", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: null },
  { id: "custom", label: "Custom", days: null },
];
const RANGE_LABEL: Record<Preset, string> = {
  d7: "7d",
  d30: "30d",
  d90: "90d",
  all: "All time",
  custom: "Range",
};

function presetRange(preset: Preset): Range {
  const days = PRESETS.find((p) => p.id === preset)?.days;
  return {
    preset,
    from: days ? new Date(Date.now() - days * 86_400_000).toISOString() : null,
    to: null,
  };
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="tabular mt-0.5 text-base font-semibold">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground">{title}</h3>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
        active ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground",
      )}
    >
      {active ? "ACTIVE" : "REMOVED"}
    </span>
  );
}

export function PartnersAdmin() {
  const [range, setRange] = useState<Range>(() => presetRange("d30"));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const list = useQuery({
    queryKey: ["admin-partners", range.from, range.to],
    queryFn: () => call<ListData>("partner_admin_list", { p_from: range.from, p_to: range.to }),
    retry: false,
    placeholderData: (prev) => prev,
  });

  function pick(preset: Preset) {
    if (preset === "custom") {
      setRange((r) => ({ ...r, preset }));
      return;
    }
    setRange(presetRange(preset));
  }
  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    setRange({
      preset: "custom",
      from: `${customFrom}T00:00:00Z`,
      to: new Date(new Date(`${customTo}T00:00:00Z`).getTime() + 86_400_000).toISOString(),
    });
  }

  const rows = list.data?.rows ?? [];
  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? rows.filter(
        (r) =>
          r.username.toLowerCase().includes(needle) ||
          r.codes.some((c) => c.toLowerCase().includes(needle)),
      )
    : rows;
  const active = rows.filter((r) => r.active);
  const sum = (f: (r: ListRow) => number) => rows.reduce((s, r) => s + Number(f(r)), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/20 p-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs",
                range.preset === p.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {range.preset === "custom" && (
          <form onSubmit={applyCustom} className="flex flex-wrap items-end gap-2">
            <input
              type="date"
              className={control}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              aria-label="From"
            />
            <input
              type="date"
              className={control}
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              aria-label="To"
            />
            <Button type="submit" size="sm" variant="secondary">
              Apply
            </Button>
          </form>
        )}
      </div>

      {list.error ? (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          {errorCopy(list.error as { message?: string }, adminErrorCopy("partners", list.error))}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Active partners" value={list.data ? active.length : "—"} />
          <Stat
            label="Attributed users"
            value={list.data ? sum((r) => r.attributed_users).toLocaleString("en-US") : "—"}
          />
          <Stat
            label={`Deposits · ${RANGE_LABEL[range.preset]}`}
            value={list.data ? formatUsd(sum((r) => r.period.deposit_cents)) : "—"}
          />
          <Stat
            label={`Commission · ${RANGE_LABEL[range.preset]}`}
            value={list.data ? formatUsd(sum((r) => r.period.commission_cents)) : "—"}
          />
          <Stat
            label="Credits added"
            value={list.data ? formatUsd(sum((r) => r.credits_cents)) : "—"}
          />
        </div>
      )}

      <AddPartner onAdded={(id) => setPicked(id)} />

      <div className="flex items-end gap-2">
        <label className="flex max-w-xs flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Filter
          <input
            className={control}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Partner or code"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              {[
                "Partner",
                "Status",
                "Leaderboard",
                "Code",
                "Users",
                `Deposits · ${RANGE_LABEL[range.preset]}`,
                "Commission %",
                "Commission",
                "Credits added",
                "Balance",
              ].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.isLoading && (
              <tr>
                <td colSpan={10} className="px-3 py-2 text-muted-foreground">
                  Loading partners…
                </td>
              </tr>
            )}
            {list.data && visible.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-2 text-muted-foreground">
                  {needle
                    ? "No partner matches that filter."
                    : "No partners yet. Search a username above, then Make partner."}
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr
                key={r.user_id}
                className={cn(
                  "cursor-pointer hover:bg-secondary/40",
                  picked === r.user_id && "bg-secondary/40",
                )}
                onClick={() => setPicked(r.user_id)}
              >
                <td className="px-3 py-2 font-medium">{r.username}</td>
                <td className="px-3 py-2">
                  <StatusBadge active={r.active} />
                </td>
                <td className="px-3 py-2">{r.leaderboard ? "On" : "Off"}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.codes.length ? r.codes.join(", ") : "—"}
                </td>
                <td className="tabular px-3 py-2">
                  {Number(r.attributed_users).toLocaleString("en-US")}
                </td>
                <td className="tabular px-3 py-2">{formatUsd(Number(r.period.deposit_cents))}</td>
                <td className="tabular px-3 py-2">{pct(r.commission_bps)}</td>
                <td className="tabular px-3 py-2">
                  {formatUsd(Number(r.period.commission_cents))}
                </td>
                <td className="tabular px-3 py-2">{formatUsd(Number(r.credits_cents))}</td>
                <td className="tabular px-3 py-2">{formatUsd(Number(r.balance_cents))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {picked && (
        <PartnerDetail
          key={picked}
          userId={picked}
          range={range}
          limits={list.data?.settings ?? null}
          onClose={() => setPicked(null)}
        />
      )}
    </div>
  );
}

function AddPartner({ onAdded }: { onAdded: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [commission, setCommission] = useState("20");
  const [busy, setBusy] = useState<string | null>(null);
  const term = q.trim();
  const search = useQuery({
    queryKey: ["admin-partner-search", term],
    queryFn: () => call<{ rows: SearchRow[] }>("partner_admin_search", { p_query: term }),
    enabled: term.length >= 2,
    retry: false,
  });

  async function add(row: SearchRow) {
    const bps = Math.round(Number(commission) * 100);
    if (!Number.isFinite(bps) || bps < 0 || bps > 10000) {
      toast.error("Commission must be between 0% and 100%.");
      return;
    }
    setBusy(row.user_id);
    try {
      await call("partner_admin_set", { p_user: row.user_id, p_commission_bps: bps, p_note: null });
      toast.success(`${row.username} is now a partner.`);
      setQ("");
      await queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-search"] });
      onAdded(row.user_id);
    } catch (e) {
      toast.error(errorCopy(e as { message?: string }, "Couldn't add that partner."));
    } finally {
      setBusy(null);
    }
  }

  const matches = Array.isArray(search.data?.rows) ? search.data.rows : [];

  return (
    <Section title="Add partner">
      <p className="mb-3 text-sm text-muted-foreground">
        The player needs an account already. Type their username or email, then Make partner.
        That does not open leaderboards. Enable leaderboard on the partner after they are added.
      </p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => e.preventDefault()}>
        <div className="min-w-[14rem] flex-1 space-y-1.5">
          <Label htmlFor="partner-search">Username or email</Label>
          <Input
            id="partner-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Start typing a username or email"
            autoComplete="off"
          />
        </div>
        <div className="w-28 space-y-1.5">
          <Label htmlFor="partner-commission">Commission %</Label>
          <Input
            id="partner-commission"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </form>
      <ul className="mt-3 min-h-12 divide-y divide-border rounded-md border border-border text-sm">
        {term.length < 2 && (
          <li className="px-3 py-2 text-muted-foreground">
            Matching accounts show here. Pick one and press Make partner.
          </li>
        )}
        {term.length >= 2 && search.isLoading && (
          <li className="px-3 py-2 text-muted-foreground">Searching…</li>
        )}
        {term.length >= 2 && search.error && (
          <li className="px-3 py-2 text-muted-foreground">
            {errorCopy(search.error as { message?: string }, "Search failed.")}
          </li>
        )}
        {term.length >= 2 && search.data && matches.length === 0 && (
          <li className="px-3 py-2 text-muted-foreground">
            No account matches. They have to sign up before you can make them a partner.
          </li>
        )}
        {term.length >= 2 &&
          matches.map((row) => (
            <li
              key={row.user_id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
            >
              <span className="min-w-0">
                <span className="font-medium">{row.username}</span>
                {row.email && (
                  <span className="ml-2 break-all text-xs text-muted-foreground">{row.email}</span>
                )}
              </span>
              {row.is_partner ? (
                <Button size="sm" variant="secondary" onClick={() => onAdded(row.user_id)}>
                  Open
                </Button>
              ) : (
                <Button size="sm" disabled={busy === row.user_id} onClick={() => void add(row)}>
                  {busy === row.user_id ? "Adding…" : "Make partner"}
                </Button>
              )}
            </li>
          ))}
      </ul>
    </Section>
  );
}

function PartnerDetail({
  userId,
  range,
  limits,
  onClose,
}: {
  userId: string;
  range: Range;
  limits: ListData["settings"] | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-partner", userId, range.from, range.to],
    queryFn: () =>
      call<Detail>("partner_admin_detail", { p_user: userId, p_from: range.from, p_to: range.to }),
    retry: false,
    placeholderData: (prev) => prev,
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-partner", userId] });
    await queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
  };

  if (q.isLoading)
    return (
      <Section title="Partner">
        <p className="text-sm text-muted-foreground">Loading partner…</p>
      </Section>
    );
  if (q.error || !q.data)
    return (
      <Section title="Partner">
        <p className="text-sm text-muted-foreground">
          {errorCopy(q.error as { message?: string } | null, "Unable to load partner.")}
        </p>
      </Section>
    );
  const d = q.data;
  const withdrawalCopy =
    d.withdrawal === "blocked"
      ? "Blocked (partner)"
      : d.withdrawal === "held"
        ? `${formatUsd(Number(d.held_cents ?? 0))} held · only new deposits withdrawable`
        : "Normal rules";

  return (
    <div className="space-y-4 rounded-xl border border-primary/30 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Partner
          </p>
          <h2 className="font-display text-xl leading-tight">{d.username}</h2>
          <p className="text-xs text-muted-foreground">
            {d.email ?? "No email"} · partner since {when(d.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge active={d.active} />
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Available" value={formatUsd(Number(d.available_cents))} />
        <Stat label="In games" value={formatUsd(Number(d.locked_cents))} />
        <Stat label="Credits added" value={formatUsd(Number(d.credits_cents))} />
        <Stat label="Withdrawals" value={<span className="text-sm">{withdrawalCopy}</span>} />
        <Stat label="Attributed users" value={Number(d.attributed_users).toLocaleString("en-US")} />
        <Stat label="Commission" value={pct(d.commission_bps)} />
      </div>

      <Section title="Deposits and commission">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Window", "Deposits", "Count", "Depositing users", "Commission"].map((h) => (
                  <th key={h} className="px-2 py-1.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(
                [
                  ["Last 7 days", d.windows.d7],
                  ["Last 30 days", d.windows.d30],
                  ["Last 90 days", d.windows.d90],
                  ["All time", d.windows.all],
                ] as const
              ).map(([label, w]) => (
                <tr key={label}>
                  <td className="px-2 py-1.5">{label}</td>
                  <td className="tabular px-2 py-1.5">{formatUsd(Number(w.deposit_cents))}</td>
                  <td className="tabular px-2 py-1.5">{Number(w.deposit_count)}</td>
                  <td className="tabular px-2 py-1.5">{Number(w.depositing_users)}</td>
                  <td className="tabular px-2 py-1.5">{formatUsd(Number(w.commission_cents))}</td>
                </tr>
              ))}
              {range.preset === "custom" && range.from && (
                <tr className="font-medium">
                  <td className="px-2 py-1.5">Selected range</td>
                  <td className="tabular px-2 py-1.5">
                    {formatUsd(Number(d.windows.range.deposit_cents))}
                  </td>
                  <td className="tabular px-2 py-1.5">{Number(d.windows.range.deposit_count)}</td>
                  <td className="tabular px-2 py-1.5">
                    {Number(d.windows.range.depositing_users)}
                  </td>
                  <td className="tabular px-2 py-1.5">
                    {formatUsd(Number(d.windows.range.commission_cents))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Credited deposits by attributed users after they redeemed the code, at the USD value
          stored when each deposit was credited. Commission is reporting only.
        </p>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Settings detail={d} onSaved={refresh} />
        <TopUp detail={d} limits={limits} onSaved={refresh} />
      </div>

      <Codes detail={d} onSaved={refresh} />

      <Section title="Top-up history">
        {d.topups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No top-ups yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  {["When", "Amount", "Admin", "Note"].map((h) => (
                    <th key={h} className="px-2 py-1.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.topups.map((t) => (
                  <tr key={t.id}>
                    <td className="px-2 py-1.5">{when(t.created_at)}</td>
                    <td className="tabular px-2 py-1.5 text-success">
                      +{formatUsd(Number(t.amount_cents))}
                    </td>
                    <td className="px-2 py-1.5">{t.admin ?? "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{t.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`Attributed users · ${RANGE_LABEL[range.preset]}`}>
        {d.users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No players are attributed to this partner yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  {[
                    "User",
                    "Code",
                    "Joined",
                    `Deposits · ${RANGE_LABEL[range.preset]}`,
                    "All time",
                  ].map((h) => (
                    <th key={h} className="px-2 py-1.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="px-2 py-1.5">{u.username}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{u.code}</td>
                    <td className="px-2 py-1.5">{when(u.attributed_at)}</td>
                    <td className="tabular px-2 py-1.5">{formatUsd(Number(u.range_cents))}</td>
                    <td className="tabular px-2 py-1.5">{formatUsd(Number(u.all_cents))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Opponents userId={userId} range={range} />
    </div>
  );
}

type OpponentRow = {
  user_id: string;
  username: string;
  games: number;
  partner_wins: number;
  opponent_wins: number;
  lost_cents: number;
  won_cents: number;
  games_played: string[];
  last_played_at: string;
  attributed: boolean;
  partner: boolean;
  profit_cents: number;
  auto_cleared_cents: number;
  held_cents: number;
  released_cents: number;
};

function Opponents({ userId, range }: { userId: string; range: Range }) {
  const qc = useQueryClient();
  const [releasing, setReleasing] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["admin-partner", userId, "opponents", range.from, range.to],
    queryFn: () =>
      call<OpponentRow[]>("partner_admin_opponents", {
        p_user: userId,
        p_from: range.from,
        p_to: range.to,
      }),
    retry: false,
    placeholderData: (prev) => prev,
  });
  const rows = q.data ?? [];
  const outstanding = (r: OpponentRow) => Number(r.held_cents ?? 0) - Number(r.released_cents ?? 0);
  return (
    <Section title={`Opponents · ${RANGE_LABEL[range.preset]}`}>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading opponents…</p>
      ) : q.error ? (
        <p className="text-sm text-muted-foreground">
          {errorCopy(q.error as { message?: string } | null, "Unable to load opponents.")}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No finished real-money PvP games in this window.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {[
                  "Opponent",
                  "Games",
                  "W / L",
                  "Partner lost to them",
                  "Partner won from them",
                  "Partner profit",
                  "Auto-cleared",
                  "Held",
                  "Released",
                  "Played",
                  "Last played",
                  "",
                ].map((h, i) => (
                  <th key={h || i} className="px-2 py-1.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <Fragment key={r.user_id}>
                  <tr
                    className={cn(
                      Number(r.games) >= 3 &&
                        Number(r.lost_cents) > Number(r.won_cents) &&
                        "bg-destructive/5",
                    )}
                  >
                    <td className="px-2 py-1.5">
                      {r.username}
                      {r.attributed && (
                        <span className="ml-1.5 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-semibold text-primary">
                          REFERRED
                        </span>
                      )}
                      {r.partner && (
                        <span className="ml-1.5 rounded bg-secondary px-1 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          PARTNER
                        </span>
                      )}
                    </td>
                    <td className="tabular px-2 py-1.5">{Number(r.games)}</td>
                    <td className="tabular px-2 py-1.5">
                      {Number(r.partner_wins)} / {Number(r.opponent_wins)}
                    </td>
                    <td className="tabular px-2 py-1.5">{formatUsd(Number(r.lost_cents))}</td>
                    <td className="tabular px-2 py-1.5">{formatUsd(Number(r.won_cents))}</td>
                    <td className="tabular px-2 py-1.5">
                      {formatUsd(Number(r.profit_cents ?? 0))}
                    </td>
                    <td className="tabular px-2 py-1.5">
                      {formatUsd(Number(r.auto_cleared_cents ?? 0))}
                    </td>
                    <td
                      className={cn(
                        "tabular px-2 py-1.5",
                        outstanding(r) > 0 && "font-semibold text-foreground",
                      )}
                    >
                      {formatUsd(outstanding(r))}
                    </td>
                    <td className="tabular px-2 py-1.5">
                      {formatUsd(Number(r.released_cents ?? 0))}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-muted-foreground">
                      {r.games_played.join(", ")}
                    </td>
                    <td className="px-2 py-1.5">{when(r.last_played_at)}</td>
                    <td className="px-2 py-1.5">
                      {outstanding(r) > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7"
                          onClick={() => setReleasing(releasing === r.user_id ? null : r.user_id)}
                        >
                          Release
                        </Button>
                      )}
                    </td>
                  </tr>
                  {releasing === r.user_id && (
                    <tr>
                      <td colSpan={12} className="bg-muted/30 px-2 py-2">
                        <ReleaseProfit
                          partnerId={userId}
                          row={r}
                          maxCents={outstanding(r)}
                          onDone={async () => {
                            setReleasing(null);
                            await qc.invalidateQueries({
                              queryKey: ["admin-partner", userId, "opponents"],
                            });
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Coinflip, Slott and Jackpot games against real players. Rows are highlighted when someone
        played the partner 3+ times and came out ahead. Partner profit is what the opponent won from
        this partner's stake (all time). Each opponent auto-clears up to $50 per partner, and the
        partner up to $100 a day across everyone; the rest is held from withdrawal until released
        here. Held profit that the player has since lost stops being held.
      </p>
    </Section>
  );
}

function ReleaseProfit({
  partnerId,
  row,
  maxCents,
  onDone,
}: {
  partnerId: string;
  row: OpponentRow;
  maxCents: number;
  onDone: () => Promise<void>;
}) {
  const [amount, setAmount] = useState((maxCents / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [request, setRequest] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseUsdToCents(amount);
    if (cents == null || cents < 1 || cents > maxCents) {
      toast.error(`Enter an amount from $0.01 to ${formatUsd(maxCents)}.`);
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Add a reason (3–500 characters).");
      return;
    }
    if (!window.confirm(`Release ${formatUsd(cents)} of held partner profit for ${row.username}?`))
      return;
    setBusy(true);
    try {
      await call("partner_admin_release_profit", {
        p_user: row.user_id,
        p_partner: partnerId,
        p_amount_cents: cents,
        p_reason: reason,
        p_request_id: request,
      });
      toast.success(`Released ${formatUsd(cents)} for ${row.username}.`);
      setRequest(crypto.randomUUID());
      await onDone();
    } catch (err) {
      const msg = (err as { message?: string }).message ?? "";
      toast.error(
        msg.includes("BAD_AMOUNT")
          ? "That is more than is still held for this player."
          : errorCopy(err as { message?: string }, "Couldn't release that amount."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`rel-amount-${row.user_id}`} className="text-xs">
          Amount (max {formatUsd(maxCents)})
        </Label>
        <Input
          id={`rel-amount-${row.user_id}`}
          className="h-8 w-28"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setRequest(crypto.randomUUID());
          }}
          inputMode="decimal"
        />
      </div>
      <div className="min-w-[14rem] flex-1 space-y-1">
        <Label htmlFor={`rel-reason-${row.user_id}`} className="text-xs">
          Reason (saved to the audit log)
        </Label>
        <Input
          id={`rel-reason-${row.user_id}`}
          className="h-8"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Releasing…" : "Release"}
      </Button>
    </form>
  );
}

function Settings({ detail, onSaved }: { detail: Detail; onSaved: () => Promise<void> }) {
  const [commission, setCommission] = useState(String(detail.commission_bps / 100));
  const [note, setNote] = useState(detail.note ?? "");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const bps = Math.round(Number(commission) * 100);
    if (!Number.isFinite(bps) || bps < 0 || bps > 10000) {
      toast.error("Commission must be between 0% and 100%.");
      return;
    }
    setBusy(true);
    try {
      const r = await call<{ status: string }>("partner_admin_set", {
        p_user: detail.user_id,
        p_commission_bps: bps,
        p_note: note,
      });
      toast.success(
        r.status === "reactivated"
          ? "Partner reactivated."
          : r.status === "unchanged"
            ? "Nothing changed."
            : "Partner updated.",
      );
      await onSaved();
    } catch (err) {
      toast.error(errorCopy(err as { message?: string }, "Couldn't save."));
    } finally {
      setBusy(false);
    }
  }

  async function setLeaderboard(enabled: boolean) {
    setBusy(true);
    try {
      await call("partner_admin_set_leaderboard", {
        p_user: detail.user_id,
        p_enabled: enabled,
      });
      toast.success(enabled ? "Leaderboard enabled." : "Leaderboard turned off.");
      await onSaved();
    } catch (err) {
      toast.error(errorCopy(err as { message?: string }, "Couldn't update leaderboard access."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Remove partner status from ${detail.username}? Their current balance stays held and their codes are turned off.`,
      )
    )
      return;
    setBusy(true);
    try {
      await call("partner_admin_remove", { p_user: detail.user_id });
      toast.success("Partner removed.");
      await onSaved();
    } catch (err) {
      toast.error(errorCopy(err as { message?: string }, "Couldn't remove that partner."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Partner settings">
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="pd-commission">Commission %</Label>
            <Input
              id="pd-commission"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-note">Note</Label>
            <Input
              id="pd-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>
        {detail.active && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={detail.leaderboard ? "secondary" : "default"}
              disabled={busy}
              onClick={() => void setLeaderboard(!detail.leaderboard)}
            >
              {detail.leaderboard ? "Turn off leaderboard" : "Enable leaderboard"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {detail.leaderboard
                ? "This partner can open leaderboards."
                : "Off until you enable it. Making someone a partner does not turn this on."}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={busy}>
            {detail.active ? "Save" : "Reactivate partner"}
          </Button>
          {detail.active && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => void remove()}
            >
              Remove partner
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {detail.active
            ? "Partners can play but cannot withdraw. This is enforced on the server."
            : `Removed ${when(detail.removed_at)}. The balance from the partner period stays held; newer deposits follow normal rules.`}
        </p>
      </form>
    </Section>
  );
}

function TopUp({
  detail,
  limits,
  onSaved,
}: {
  detail: Detail;
  limits: ListData["settings"] | null;
  onSaved: () => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [request, setRequest] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const min = Number(limits?.min_topup_cents ?? 100);
  const max = Number(limits?.max_topup_cents ?? 200000);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseUsdToCents(amount);
    if (cents == null || cents < min || cents > max) {
      toast.error(`Enter an amount from ${formatUsd(min)} to ${formatUsd(max)}.`);
      return;
    }
    if (!window.confirm(`Add ${formatUsd(cents)} of promotional credits to ${detail.username}?`))
      return;
    setBusy(true);
    try {
      await call("partner_admin_topup", {
        p_user: detail.user_id,
        p_amount_cents: cents,
        p_note: note,
        p_request_id: request,
      });
      toast.success(`Added ${formatUsd(cents)} to ${detail.username}.`);
      setAmount("");
      setNote("");
      setRequest(crypto.randomUUID());
      await onSaved();
    } catch (err) {
      toast.error(errorCopy(err as { message?: string }, "Couldn't add credits."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Add partner credits">
      {!detail.active ? (
        <p className="text-sm text-muted-foreground">Only active partners can receive credits.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="pd-amount">Amount (USD)</Label>
              <Input
                id="pd-amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setRequest(crypto.randomUUID());
                }}
                inputMode="decimal"
                placeholder="500.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd-topup-note">Reason (optional)</Label>
              <Input
                id="pd-topup-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Adding…" : "Add credits"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {formatUsd(min)} to {formatUsd(max)} per top-up. Credits are playable and never
            withdrawable while the account is a partner.
          </p>
        </form>
      )}
    </Section>
  );
}

function Codes({ detail, onSaved }: { detail: Detail; onSaved: () => Promise<void> }) {
  const [code, setCode] = useState("");
  const [reward, setReward] = useState("2.00");
  const [maxClaims, setMaxClaims] = useState("1000");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseUsdToCents(reward);
    const max = Number(maxClaims);
    if (cents == null || cents < 100 || cents > 500) {
      toast.error("Reward must be between $1.00 and $5.00.");
      return;
    }
    if (!Number.isInteger(max) || max < 1) {
      toast.error("Max claims must be a positive whole number.");
      return;
    }
    setBusy(true);
    try {
      await call("partner_admin_create_code", {
        p_user: detail.user_id,
        p_code: code,
        p_reward_cents: cents,
        p_max_claims: max,
        p_expires: expires ? new Date(expires).toISOString() : null,
      });
      toast.success("Partner code created.");
      setCode("");
      await onSaved();
    } catch (err) {
      toast.error(errorCopy(err as { message?: string }, "Couldn't create that code."));
    } finally {
      setBusy(false);
    }
  }

  async function removeCode(row: Detail["codes"][number]) {
    if (!window.confirm(`Delete promo code ${row.code}? This cannot be undone.`)) return;
    try {
      await call("promo_admin_delete", { p_id: row.id });
      toast.success("Promo code deleted.");
      await onSaved();
    } catch (err) {
      toast.error(errorCopy(err as { message?: string }, "Couldn't delete that code."));
    }
  }

  async function update(row: Detail["codes"][number], next: { active?: boolean; max?: number }) {
    try {
      await call("promo_admin_update", {
        p_id: row.id,
        p_active: next.active ?? row.active,
        p_max_claims: next.max ?? row.max_claims,
        p_expires: row.expires_at,
        p_touch_expiry: false,
      });
      await onSaved();
    } catch (err) {
      toast.error(errorCopy(err as { message?: string }, "Couldn't update that code."));
    }
  }

  return (
    <Section title="Promo codes">
      {detail.active && (
        <form onSubmit={create} className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="pc-code">Code</Label>
            <Input
              id="pc-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="uppercase"
              maxLength={16}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pc-reward">Viewer reward (USD)</Label>
            <Input
              id="pc-reward"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              inputMode="decimal"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pc-max">Max claims</Label>
            <Input
              id="pc-max"
              value={maxClaims}
              onChange={(e) => setMaxClaims(e.target.value)}
              inputMode="numeric"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pc-exp">Expires (optional)</Label>
            <Input
              id="pc-exp"
              type="datetime-local"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Creating…" : "Create code"}
            </Button>
          </div>
        </form>
      )}
      {detail.codes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No codes yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Code", "Reward", "Claims", "Attributed", "Expires", "Status", ""].map((h, i) => (
                  <th key={i} className="px-2 py-1.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {detail.codes.map((c) => (
                <tr key={c.id}>
                  <td className="px-2 py-1.5 font-mono font-medium">{c.code}</td>
                  <td className="tabular px-2 py-1.5">{formatUsd(Number(c.reward_cents))}</td>
                  <td className="tabular px-2 py-1.5">
                    {c.claim_count} / {c.max_claims}
                  </td>
                  <td className="tabular px-2 py-1.5">{Number(c.attributed_users)}</td>
                  <td className="px-2 py-1.5">{when(c.expires_at)}</td>
                  <td className="px-2 py-1.5">{c.active ? "Active" : "Disabled"}</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="inline-flex gap-3">
                      {detail.active && (
                        <>
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => {
                              const v = window.prompt("New max claims", String(c.max_claims));
                              const max = v == null ? NaN : Number(v);
                              if (Number.isInteger(max) && max >= c.claim_count && max >= 1)
                                void update(c, { max });
                              else if (v != null)
                                toast.error(
                                  `Max claims must be a whole number of at least ${Math.max(1, c.claim_count)}.`,
                                );
                            }}
                          >
                            Edit limit
                          </button>
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => void update(c, { active: !c.active })}
                          >
                            {c.active ? "Disable" : "Enable"}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => void removeCode(c)}
                      >
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Viewers get the reward under the normal promo rules. A code with no claims can be deleted.
        A code that was already claimed can be disabled, and the claim history stays.
      </p>
    </Section>
  );
}
