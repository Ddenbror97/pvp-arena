import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import { leaderboardCall, leaderboardError, statusLabel } from "@/lib/leaderboard/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  description: string;
  version: number;
  status: "active" | "archived";
  min_duration_seconds: number;
  max_duration_seconds: number;
  max_prize_pool_cents: number;
  allowed_games: string[];
  max_tiers: number;
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string;
  prize_pool_cents: number;
  funding_status: string;
  funding_shortfall: boolean;
  bankroll_at_check_cents: number | null;
  cancel_requested_at: string | null;
  partner_username: string;
  participants: number;
  qualifying_cents: number;
  failed_awards: number;
  paid_cents: number;
};

type Detail = {
  campaign: {
    name: string;
    description: string;
    status: string;
    games: string[];
    starts_at: string;
    ends_at: string;
    timezone: string;
    prize_pool_cents: number;
    min_wager_cents: number;
  };
  funding: { status: string; bankroll_at_check_cents: number | null; shortfall: boolean };
  rejection_reason: string | null;
  cancel_requested_at: string | null;
  failed: { rank: number; username: string; reward_cents: number; last_error: string | null }[];
  audit: { action: string; created_at: string; details: Record<string, unknown> }[];
  rules?: string[];
};

const GAMES = ["jackpot", "coinflip", "roulette", "slott"];
const control = "h-9 rounded-md border border-border bg-background px-2 text-sm";

export function LeaderboardsAdmin() {
  const qc = useQueryClient();
  const templates = useQuery({
    queryKey: ["leaderboard-admin-templates"],
    networkMode: "always",
    retry: false,
    queryFn: () => leaderboardCall<Template[]>("leaderboard_admin_templates"),
  });
  const [status, setStatus] = useState("pending_approval");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const campaigns = useQuery({
    queryKey: ["leaderboard-admin-campaigns", status, q],
    networkMode: "always",
    retry: false,
    queryFn: () =>
      leaderboardCall<{ rows: CampaignRow[] }>("leaderboard_admin_campaigns", {
        p_status: status,
        p_search: q,
        p_limit: 30,
        p_offset: 0,
      }),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const cashflow = useQuery({
    queryKey: ["admin-ledger-cashflow"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_ledger_cashflow" as never);
      if (error) throw error;
      return data as { balances?: { house_bankroll?: number } };
    },
  });
  const bankroll = cashflow.data?.balances?.house_bankroll ?? null;
  const detail = useQuery({
    queryKey: ["leaderboard-admin-detail", selected],
    networkMode: "always",
    retry: false,
    enabled: Boolean(selected),
    queryFn: () => leaderboardCall<Detail>("leaderboard_admin_get", { p_campaign: selected }),
  });
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    status: "active",
    minHours: "720",
    maxHours: "720",
    cap: "1500",
    games: [...GAMES],
    maxTiers: "10",
  });

  async function saveTemplate() {
    const cap = parseUsdToCents(form.cap);
    if (cap == null) {
      toast.error("Enter the prize cap in dollars.");
      return;
    }
    try {
      await leaderboardCall("leaderboard_admin_save_template", {
        p: {
          id: form.id || null,
          name: form.name,
          description: form.description,
          status: form.status,
          min_duration_seconds: Number(form.minHours) * 3600,
          max_duration_seconds: Number(form.maxHours) * 3600,
          max_prize_pool_cents: cap,
          allowed_games: form.games,
          max_tiers: Number(form.maxTiers),
        },
      });
      toast.success(
        form.id
          ? "Template updated. Running campaigns keep their frozen copy."
          : "Template created.",
      );
      setForm({ ...form, id: "", name: "", description: "" });
      void qc.invalidateQueries({ queryKey: ["leaderboard-admin-templates"] });
    } catch (error) {
      toast.error(leaderboardError(error, "Could not save the template."));
    }
  }

  async function decide(action: string) {
    if (!selected) return;
    const note = reason.trim();
    const needsNote = action === "reject" || action === "suspend" || action === "cancel";
    if (needsNote && note.length < 8) {
      toast.error("Write a reason of at least 8 characters.");
      return;
    }
    try {
      await leaderboardCall("leaderboard_admin_decide", {
        p_campaign: selected,
        p_action: action,
        p_reason: note,
      });
      toast.success("Updated.");
      setReason("");
      void qc.invalidateQueries({ queryKey: ["leaderboard-admin-campaigns"] });
      void qc.invalidateQueries({ queryKey: ["leaderboard-admin-detail", selected] });
    } catch (error) {
      toast.error(leaderboardError(error, "Could not update that campaign."));
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-display text-lg">Templates</h2>
        <p className="text-xs text-muted-foreground">
          Editing a template starts a new version. Campaigns that are already approved keep the
          rules they froze.
        </p>
        {templates.isLoading ? <div className="h-16 animate-pulse rounded-lg bg-card" /> : null}
        {templates.error ? (
          <p className="text-sm">
            {leaderboardError(templates.error, "Unable to load templates.")}
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-card text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Hours</th>
                <th className="px-3 py-2">Cap</th>
                <th className="px-3 py-2">Games</th>
              </tr>
            </thead>
            <tbody>
              {(templates.data ?? []).map((template) => (
                <tr key={template.id} className="border-t border-border bg-card">
                  <td className="px-3 py-2">
                    <button
                      className="text-left text-primary hover:underline"
                      onClick={() =>
                        setForm({
                          id: template.id,
                          name: template.name,
                          description: template.description,
                          status: template.status,
                          minHours: String(template.min_duration_seconds / 3600),
                          maxHours: String(template.max_duration_seconds / 3600),
                          cap: (template.max_prize_pool_cents / 100).toFixed(2),
                          games: template.allowed_games,
                          maxTiers: String(template.max_tiers),
                        })
                      }
                    >
                      {template.name}
                    </button>
                  </td>
                  <td className="px-3 py-2 tabular">{template.version}</td>
                  <td className="px-3 py-2">{template.status}</td>
                  <td className="px-3 py-2 tabular">
                    {template.min_duration_seconds / 3600}–{template.max_duration_seconds / 3600}
                  </td>
                  <td className="px-3 py-2 tabular">{formatUsd(template.max_prize_pool_cents)}</td>
                  <td className="px-3 py-2">{template.allowed_games.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-2">
          <label className="text-xs">
            Name
            <input
              className={cn(control, "mt-1 w-full")}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label className="text-xs">
            Status
            <select
              className={cn(control, "mt-1 w-full")}
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="text-xs sm:col-span-2">
            Description
            <textarea
              className={cn(control, "mt-1 h-20 w-full py-2")}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label className="text-xs">
            Minimum hours
            <input
              className={cn(control, "mt-1 w-full")}
              value={form.minHours}
              onChange={(event) => setForm({ ...form, minHours: event.target.value })}
            />
          </label>
          <label className="text-xs">
            Maximum hours
            <input
              className={cn(control, "mt-1 w-full")}
              value={form.maxHours}
              onChange={(event) => setForm({ ...form, maxHours: event.target.value })}
            />
          </label>
          <label className="text-xs">
            Prize cap (USD)
            <input
              className={cn(control, "mt-1 w-full")}
              value={form.cap}
              onChange={(event) => setForm({ ...form, cap: event.target.value })}
            />
          </label>
          <label className="text-xs">
            Max tiers
            <input
              className={cn(control, "mt-1 w-full")}
              value={form.maxTiers}
              onChange={(event) => setForm({ ...form, maxTiers: event.target.value })}
            />
          </label>
          <fieldset className="text-xs sm:col-span-2">
            <legend>Games</legend>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {GAMES.map((game) => (
                <label key={game} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.games.includes(game)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        games: event.target.checked
                          ? [...form.games, game]
                          : form.games.filter((item) => item !== game),
                      })
                    }
                  />
                  {game}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" onClick={() => void saveTemplate()}>
              {form.id ? "Update template" : "Create template"}
            </Button>
            {form.id ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setForm({ ...form, id: "", name: "", description: "" })}
              >
                New instead
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Campaigns</h2>
        <div className="flex flex-wrap gap-2">
          <select
            className={control}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Status"
          >
            <option value="">All</option>
            {[
              "pending_approval",
              "scheduled",
              "active",
              "closing",
              "settling",
              "under_review",
              "completed",
              "suspended",
              "cancelled",
              "rejected",
              "draft",
            ].map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
          <input
            className={control}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or partner"
            aria-label="Search"
          />
          <Button size="sm" variant="secondary" onClick={() => setQ(search)}>
            Search
          </Button>
        </div>
        {campaigns.isLoading ? <div className="h-24 animate-pulse rounded-lg bg-card" /> : null}
        {campaigns.error ? (
          <p className="text-sm">
            {leaderboardError(campaigns.error, "Unable to load campaigns.")}
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-card text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Partner</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Prize pool</th>
                <th className="px-3 py-2">Qualifying wager</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Check</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns.data?.rows ?? []).map((row) => (
                <tr key={row.id} className="border-t border-border bg-card">
                  <td className="px-3 py-2">
                    <button
                      className="text-primary hover:underline"
                      onClick={() => setSelected(row.id)}
                    >
                      {row.name}
                    </button>
                  </td>
                  <td className="px-3 py-2">@{row.partner_username}</td>
                  <td className="px-3 py-2">
                    {statusLabel(row.status)}
                    {row.cancel_requested_at ? " · cancel requested" : ""}
                    {row.failed_awards ? ` · ${row.failed_awards} failed` : ""}
                  </td>
                  <td className="px-3 py-2 tabular">{formatUsd(row.prize_pool_cents)}</td>
                  <td className="px-3 py-2 tabular">{formatUsd(row.qualifying_cents)}</td>
                  <td className="px-3 py-2 tabular">{formatUsd(row.paid_cents)}</td>
                  <td className="px-3 py-2 text-xs">
                    {row.funding_status === "checked"
                      ? row.funding_shortfall
                        ? "Short, not reserved"
                        : "Covered, not reserved"
                      : "Not checked"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {detail.data ? (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
            <h3 className="font-display text-base">{detail.data.campaign.name}</h3>
            <p className="text-muted-foreground">{detail.data.campaign.description}</p>
            <p>
              {statusLabel(detail.data.campaign.status)} ·{" "}
              {(detail.data.campaign.games ?? []).join(", ")} ·{" "}
              {formatUsd(detail.data.campaign.prize_pool_cents)}
            </p>
            {(() => {
              const pool = detail.data.campaign.prize_pool_cents;
              const short = bankroll != null && bankroll < pool;
              return (
                <p className={short ? "text-destructive" : undefined}>
                  Prize pool {formatUsd(pool)}
                  {bankroll != null ? ` · house bankroll ${formatUsd(bankroll)}` : ""}.
                  {short
                    ? " The bankroll is smaller. Write why you still approve. The prizes are not set aside."
                    : " This is a promise, not money set aside."}
                </p>
              );
            })()}
            {detail.data.funding.bankroll_at_check_cents != null ? (
              <p>
                Last bankroll check: {formatUsd(detail.data.funding.bankroll_at_check_cents)}
                {detail.data.funding.shortfall ? " · short at approval" : ""}
              </p>
            ) : null}
            {detail.data.rejection_reason ? <p>Note: {detail.data.rejection_reason}</p> : null}
            <label className="block text-sm">
              Reason
              <textarea
                className={cn(control, "mt-1 h-20 w-full py-2")}
                placeholder="Needed to approve when the bankroll is short, or to reject, suspend, or cancel."
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            {detail.data.cancel_requested_at ? <p>The partner requested cancellation.</p> : null}
            {detail.data.failed?.length ? (
              <div>
                <h4 className="font-medium">Payout exceptions</h4>
                <ul className="mt-1 space-y-1">
                  {detail.data.failed.map((award) => (
                    <li key={award.rank}>
                      Rank {award.rank} @{award.username} {formatUsd(award.reward_cents)} —{" "}
                      {award.last_error || "failed"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted-foreground">No failed payouts.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void decide("approve")}>
                Approve
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void decide("reject")}>
                Reject
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void decide("suspend")}>
                Suspend
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void decide("resume")}>
                Resume
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void decide("cancel")}>
                Cancel
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void decide("retry")}>
                Retry payouts
              </Button>
            </div>
            <details>
              <summary className="cursor-pointer">Audit</summary>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(detail.data.audit ?? []).map((row, index) => (
                  <li key={`${row.action}-${index}`}>
                    {new Date(row.created_at).toLocaleString()} · {row.action}
                    {typeof row.details?.["reason"] === "string"
                      ? ` · ${row.details["reason"]}`
                      : ""}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : null}
      </section>
    </div>
  );
}
