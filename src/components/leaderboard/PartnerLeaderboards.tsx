import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatUsd, parseUsdToCents } from "@/lib/jackpot/math";
import {
  LEADERBOARD_PRIZE_MAX_CENTS,
  prizePoolAllowed,
  prizePoolCents,
  type PrizeTier,
} from "@/lib/leaderboard/prize";
import { zonedLocalToUtc } from "@/lib/leaderboard/time";
import {
  leaderboardCall,
  leaderboardError,
  statusLabel,
  type LeaderboardStatus,
} from "@/lib/leaderboard/api";
import { Button } from "@/components/ui/button";
import { OG_SITE_URL } from "@/lib/og";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  description: string;
  version: number;
  min_duration_seconds: number;
  max_duration_seconds: number;
  max_prize_pool_cents: number;
  allowed_games: string[];
  max_tiers: number;
};

type CampaignRow = {
  id: string;
  name: string;
  status: LeaderboardStatus;
  starts_at: string;
  ends_at: string;
  timezone: string;
  prize_pool_cents: number;
  funding_status: string;
  funding_shortfall: boolean;
  cancel_requested_at: string | null;
  visibility: string;
  participants: number;
  qualifying_cents: number;
  paid_cents: number;
};

type ListResponse = {
  total: number;
  stats: {
    active: number;
    scheduled: number;
    completed: number;
    qualifying_cents: number;
    participants: number;
    prize_pool_cents: number;
    paid_cents: number;
  };
  rows: CampaignRow[];
};

type Draft = {
  id: string | null;
  updated_at: string | null;
  template_id: string;
  name: string;
  description: string;
  visibility: "public" | "unlisted";
  timezone: string;
  startIn: "soon" | "tomorrow" | "keep";
  lengthDays: number;
  startLocal: string;
  endLocal: string;
  games: string[];
  minWager: string;
  tiers: { rank_start: string; rank_end: string; dollars: string }[];
};

const GAMES = ["jackpot", "coinflip", "roulette", "slott", "poker"] as const;
const control = "h-9 w-full rounded-md border border-border bg-background px-2 text-sm";

function clock(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

const LENGTH_DAYS = [30] as const;

function windowFor(startIn: Draft["startIn"], days: number, now = Date.now()) {
  const start = now + (startIn === "tomorrow" ? 24 * 60 * 60 * 1000 : 15 * 60 * 1000);
  return {
    timezone: "UTC" as const,
    startLocal: clock(start),
    endLocal: clock(start + days * 24 * 60 * 60 * 1000),
  };
}

function blankDraft(template?: Template): Draft {
  return {
    id: null,
    updated_at: null,
    template_id: template?.id ?? "",
    name: "",
    description: "",
    visibility: "public",
    startIn: "soon",
    lengthDays: 30,
    ...windowFor("soon", 30),
    games: template ? [...template.allowed_games] : [],
    minWager: "0",
    tiers: [{ rank_start: "1", rank_end: "1", dollars: "" }],
  };
}

function payload(draft: Draft) {
  const start = zonedLocalToUtc(draft.startLocal, draft.timezone);
  const end = zonedLocalToUtc(draft.endLocal, draft.timezone);
  const min = parseUsdToCents(draft.minWager);
  const tiers: PrizeTier[] = draft.tiers.map((tier) => ({
    rank_start: Number(tier.rank_start),
    rank_end: Number(tier.rank_end),
    reward_cents: parseUsdToCents(tier.dollars) ?? -1,
  }));
  return { start, end, min, tiers, pool: prizePoolCents(tiers) };
}

export function PartnerLeaderboards() {
  const qc = useQueryClient();
  const access = useQuery({
    queryKey: ["leaderboard-access"],
    networkMode: "always",
    retry: false,
    queryFn: () => leaderboardCall<{ partner: boolean; admin: boolean }>("leaderboard_my_access"),
  });
  const templates = useQuery({
    queryKey: ["leaderboard-templates"],
    networkMode: "always",
    retry: false,
    enabled: access.data?.partner === true,
    queryFn: () => leaderboardCall<Template[]>("leaderboard_partner_templates"),
  });
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["leaderboard-partner", status, sort, page],
    networkMode: "always",
    retry: false,
    enabled: access.data?.partner === true,
    queryFn: () =>
      leaderboardCall<ListResponse>("leaderboard_partner_list", {
        p_status: status,
        p_sort: sort,
        p_limit: 20,
        p_offset: page * 20,
      }),
  });
  const acquisition = useQuery({
    queryKey: ["partner-acquisition-code"],
    networkMode: "always",
    retry: false,
    enabled: access.data?.partner === true,
    queryFn: () => leaderboardCall<{ ok: boolean; code?: string }>("partner_acquisition_mine"),
  });
  const cohort = useQuery({
    queryKey: ["leaderboard-partner-cohort"],
    networkMode: "always",
    retry: false,
    enabled: access.data?.partner === true,
    queryFn: () =>
      leaderboardCall<{
        referred_players: number;
        depositors: number;
        deposit_cents: number;
        eligible_wager_cents: number;
        rows: { rank: number; username: string; qualifying_cents: number }[];
      }>("leaderboard_partner_cohort"),
  });
  const [wizard, setWizard] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function downloadReport(id: string) {
    try {
      const detail = await leaderboardCall<{
        campaign: { name: string };
        rows: {
          rank: number;
          username: string;
          qualifying_cents: number;
          prize_cents: number | null;
          payout_status: string | null;
        }[];
        daily: { day: string; qualifying_cents: number; players: number }[];
      }>("leaderboard_partner_get", { p_campaign: id });
      const lines = ["rank,username,qualifying_usd,prize_usd,payout"];
      for (const row of detail.rows ?? []) {
        lines.push(
          [
            row.rank,
            JSON.stringify(row.username),
            (row.qualifying_cents / 100).toFixed(2),
            row.prize_cents == null ? "" : (row.prize_cents / 100).toFixed(2),
            row.payout_status ?? "",
          ].join(","),
        );
      }
      lines.push("");
      lines.push("day,qualifying_usd,players");
      for (const day of detail.daily ?? [])
        lines.push(
          [day.day, (Number(day.qualifying_cents) / 100).toFixed(2), day.players].join(","),
        );
      const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${detail.campaign.name.replace(/[^\w.-]+/g, "-") || "leaderboard"}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(leaderboardError(error, "Could not download that report."));
    }
  }

  async function openExisting(id: string) {
    const detail = await leaderboardCall<{
      campaign: {
        id: string;
        name: string;
        description: string;
        visibility: "public" | "unlisted";
        timezone: string;
        starts_at: string;
        ends_at: string;
        games: string[];
        min_wager_cents: number;
        status: string;
      };
      tiers: PrizeTier[];
      template_id: string;
      updated_at: string;
    }>("leaderboard_partner_get", { p_campaign: id });
    const zone = detail.campaign.timezone || "UTC";
    const startMs = new Date(detail.campaign.starts_at).getTime();
    const endMs = new Date(detail.campaign.ends_at).getTime();
    const days = Math.max(1, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)));
    setWizard({
      id: detail.campaign.id,
      updated_at: detail.updated_at,
      template_id: detail.template_id,
      name: detail.campaign.name,
      description: detail.campaign.description ?? "",
      visibility: detail.campaign.visibility,
      startIn: startMs > Date.now() + 6 * 60 * 1000 ? "keep" : "soon",
      lengthDays: days,
      timezone: zone,
      startLocal: new Date(detail.campaign.starts_at)
        .toLocaleString("sv-SE", { timeZone: zone })
        .replace(" ", "T")
        .slice(0, 16),
      endLocal: new Date(detail.campaign.ends_at)
        .toLocaleString("sv-SE", { timeZone: zone })
        .replace(" ", "T")
        .slice(0, 16),
      games: detail.campaign.games,
      minWager: (detail.campaign.min_wager_cents / 100).toFixed(2),
      tiers: detail.tiers.map((tier) => ({
        rank_start: String(tier.rank_start),
        rank_end: String(tier.rank_end),
        dollars: (tier.reward_cents / 100).toFixed(2),
      })),
    });
  }

  async function save(submit: boolean) {
    if (!wizard) return;
    const current =
      wizard.startIn === "keep"
        ? wizard
        : { ...wizard, ...windowFor(wizard.startIn, wizard.lengthDays) };
    if (current !== wizard) setWizard(current);
    const body = payload(current);
    if (!body.start || !body.end || body.min == null || body.pool == null) {
      toast.error("Check the schedule, minimum wager, and prizes before saving.");
      return;
    }
    setBusy(true);
    try {
      const saved = await leaderboardCall<{ campaign: { id: string }; updated_at: string }>(
        "leaderboard_partner_save",
        {
          p: {
            id: current.id,
            expected_updated_at: current.updated_at,
            template_id: current.template_id,
            name: current.name,
            description: current.description,
            visibility: current.visibility,
            timezone: current.timezone,
            starts_at: body.start.toISOString(),
            ends_at: body.end.toISOString(),
            games: current.games,
            min_wager_cents: body.min,
            tiers: body.tiers,
          },
        },
      );
      setWizard({ ...current, id: saved.campaign.id, updated_at: saved.updated_at });
      if (submit) {
        if (
          !window.confirm(
            "Send this leaderboard to an admin for approval? You cannot edit it until they send it back.",
          )
        ) {
          toast.success("Draft saved.");
          void qc.invalidateQueries({ queryKey: ["leaderboard-partner"] });
          return;
        }
        await leaderboardCall("leaderboard_partner_submit", { p_campaign: saved.campaign.id });
        toast.success("Submitted for approval.");
        setWizard(null);
      } else {
        toast.success("Draft saved.");
      }
      void qc.invalidateQueries({ queryKey: ["leaderboard-partner"] });
    } catch (error) {
      toast.error(leaderboardError(error, "Could not save this campaign."));
    } finally {
      setBusy(false);
    }
  }

  if (access.isLoading) return <div className="h-40 animate-pulse rounded-lg bg-card" />;
  if (access.error)
    return (
      <p className="text-sm">{leaderboardError(access.error, "Unable to load leaderboards.")}</p>
    );
  if (!access.data?.partner) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <p>Leaderboards are enabled per partner. An admin turns that on from Admin → Partners.</p>
        {access.data?.admin ? (
          <p className="mt-3">
            <Link
              to="/admin"
              search={{ section: "partners" }}
              className="text-primary hover:underline"
            >
              Open Partners in admin
            </Link>{" "}
            and enable leaderboard for that partner. Making them a partner does not open this page.
          </p>
        ) : null}
      </div>
    );
  }

  if (wizard) {
    return (
      <Wizard
        draft={wizard}
        setDraft={setWizard}
        templates={templates.data ?? []}
        busy={busy}
        onClose={() => setWizard(null)}
        onSave={() => void save(false)}
        onSubmit={() => void save(true)}
      />
    );
  }

  const stats = list.data?.stats;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl">Leaderboards</h1>
        <Button
          size="sm"
          onClick={() => setWizard(blankDraft(templates.data?.[0]))}
          disabled={!templates.data?.length}
        >
          New leaderboard
        </Button>
      </div>
      {templates.data && templates.data.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No active template yet. An admin has to publish one before you can create a campaign.
        </p>
      ) : null}
      {acquisition.data?.ok && acquisition.data.code ? (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          Partner link{" "}
          <span className="break-all font-medium text-foreground">
            {OG_SITE_URL}/partner/{acquisition.data.code}
          </span>
        </p>
      ) : null}
      {cohort.data ? (
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
            {[
              ["Referred players", String(cohort.data.referred_players)],
              ["Depositors", String(cohort.data.depositors)],
              ["Deposits", formatUsd(cohort.data.deposit_cents)],
              ["Eligible wager", formatUsd(cohort.data.eligible_wager_cents)],
            ].map(([label, value]) => (
              <div key={label} className="bg-card px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 tabular text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {cohort.data.rows.length > 0 ? (
            <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {cohort.data.rows.map((row) => (
                <li key={row.rank} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    <span className="tabular text-muted-foreground">{row.rank}. </span>
                    {row.username}
                  </span>
                  <span className="tabular">{formatUsd(row.qualifying_cents)}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
      {stats ? (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          {[
            ["Active", String(stats.active)],
            ["Scheduled", String(stats.scheduled)],
            ["Completed", String(stats.completed)],
            ["Qualifying wagers", formatUsd(stats.qualifying_cents)],
            ["Players", String(stats.participants)],
            ["Prize commitment", formatUsd(stats.prize_pool_cents)],
            ["Prizes paid", formatUsd(stats.paid_cents)],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-1 tabular text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Rankings count only wagers paid from deposited money. Promo codes, referral, partner, and
        prize credits never count, and neither do winnings from them.
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          className={cn(control, "w-auto")}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(0);
          }}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {[
            "draft",
            "pending_approval",
            "scheduled",
            "active",
            "closing",
            "settling",
            "under_review",
            "completed",
            "cancelled",
            "rejected",
            "suspended",
          ].map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
            </option>
          ))}
        </select>
        <select
          className={cn(control, "w-auto")}
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort"
        >
          <option value="updated">Recently updated</option>
          <option value="starts">Start time</option>
          <option value="name">Name</option>
        </select>
      </div>
      {list.isLoading ? <div className="h-40 animate-pulse rounded-lg bg-card" /> : null}
      {list.error ? (
        <p className="text-sm">{leaderboardError(list.error, "Unable to load your campaigns.")}</p>
      ) : null}
      {list.data && list.data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No campaigns in this filter.</p>
      ) : null}
      {list.data && list.data.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-card text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Window</th>
                <th className="px-3 py-2">Players</th>
                <th className="px-3 py-2">Qualifying wager</th>
                <th className="px-3 py-2">Prize pool</th>
                <th className="px-3 py-2">Funding check</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.data.rows.map((row) => (
                <tr key={row.id} className="border-t border-border bg-card">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">
                    {statusLabel(row.status)}
                    {row.cancel_requested_at ? " · cancel requested" : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(row.starts_at).toLocaleString()} –{" "}
                    {new Date(row.ends_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 tabular">{row.participants}</td>
                  <td className="px-3 py-2 tabular">{formatUsd(row.qualifying_cents)}</td>
                  <td className="px-3 py-2 tabular">{formatUsd(row.prize_pool_cents)}</td>
                  <td className="px-3 py-2 text-xs">
                    {row.funding_status === "checked"
                      ? row.funding_shortfall
                        ? "Short at approval. Not reserved."
                        : "Covered at approval. Not reserved."
                      : "Not checked"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "draft" || row.status === "rejected" ? (
                        <button
                          className="text-primary hover:underline"
                          onClick={() =>
                            void openExisting(row.id).catch((error) =>
                              toast.error(leaderboardError(error, "Unable to open that draft.")),
                            )
                          }
                        >
                          Edit
                        </button>
                      ) : null}
                      {[
                        "scheduled",
                        "active",
                        "closing",
                        "settling",
                        "under_review",
                        "completed",
                        "cancelled",
                        "suspended",
                      ].includes(row.status) && row.visibility === "public" ? (
                        <Link
                          to="/leaderboards/$campaignId"
                          params={{ campaignId: row.id }}
                          className="text-primary hover:underline"
                        >
                          View
                        </Link>
                      ) : null}
                      <button
                        className="text-primary hover:underline"
                        onClick={() => void downloadReport(row.id)}
                      >
                        Report
                      </button>
                      <button
                        className="text-primary hover:underline"
                        onClick={() =>
                          void leaderboardCall("leaderboard_partner_duplicate", {
                            p_campaign: row.id,
                          })
                            .then(() => {
                              toast.success("Draft copy created.");
                              void qc.invalidateQueries({ queryKey: ["leaderboard-partner"] });
                            })
                            .catch((error) =>
                              toast.error(leaderboardError(error, "Could not duplicate.")),
                            )
                        }
                      >
                        Duplicate
                      </button>
                      {[
                        "draft",
                        "pending_approval",
                        "rejected",
                        "scheduled",
                        "active",
                        "suspended",
                        "closing",
                      ].includes(row.status) ? (
                        <button
                          className="text-primary hover:underline"
                          onClick={() => {
                            if (
                              !window.confirm(
                                "Remove this campaign? It leaves the public list. Prizes that were not created are not paid.",
                              )
                            )
                              return;
                            void leaderboardCall("leaderboard_partner_cancel", {
                              p_campaign: row.id,
                            })
                              .then(() =>
                                qc.invalidateQueries({ queryKey: ["leaderboard-partner"] }),
                              )
                              .catch((error) =>
                                toast.error(
                                  leaderboardError(error, "Could not remove this campaign."),
                                ),
                              );
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page === 0}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!list.data || (page + 1) * 20 >= list.data.total}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function placeName(start: string, end: string) {
  const from = Number(start);
  const to = Number(end);
  if (!Number.isInteger(from) || !Number.isInteger(to)) return "Prize";
  if (from !== to) return `Ranks ${from}–${to}, each`;
  const teen = from % 100;
  const suffix =
    teen >= 11 && teen <= 13
      ? "th"
      : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[from % 10] ?? "th");
  return `${from}${suffix} place`;
}

function gameName(game: string) {
  if (game === "slott") return "Slott";
  return game.slice(0, 1).toUpperCase() + game.slice(1);
}

function Wizard({
  draft,
  setDraft,
  templates,
  busy,
  onClose,
  onSave,
  onSubmit,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  templates: Template[];
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
  onSubmit: () => void;
}) {
  const template = templates.find((item) => item.id === draft.template_id) ?? templates[0];
  const parsed = useMemo(() => payload(draft), [draft]);
  const minHours = (template?.min_duration_seconds ?? 3600) / 3600;
  const maxHours = (template?.max_duration_seconds ?? 720 * 3600) / 3600;
  const lengths: number[] = LENGTH_DAYS.filter(
    (days) => days * 24 >= minHours && days * 24 <= maxHours,
  );
  if (
    !lengths.includes(draft.lengthDays) &&
    draft.lengthDays * 24 >= minHours &&
    draft.lengthDays * 24 <= maxHours
  )
    lengths.push(draft.lengthDays);
  lengths.sort((a, b) => a - b);
  const nameOk = draft.name.trim().length >= 3 && draft.name.trim().length <= 60;
  const gamesOk = draft.games.length > 0;
  const prizesOk = parsed.pool != null;
  const poolCap = Math.min(
    template?.max_prize_pool_cents ?? LEADERBOARD_PRIZE_MAX_CENTS,
    LEADERBOARD_PRIZE_MAX_CENTS,
  );
  const inRange = prizePoolAllowed(parsed.pool, poolCap);
  const scheduleOk = !!parsed.start && !!parsed.end && parsed.end > parsed.start;
  const ready = nameOk && gamesOk && prizesOk && inRange && scheduleOk;
  const when =
    parsed.start && parsed.end
      ? `Runs ${parsed.start.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} to ${parsed.end.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
      : "";
  const pickSchedule = (startIn: Draft["startIn"], days: number) =>
    setDraft({
      ...draft,
      startIn,
      lengthDays: days,
      ...(startIn === "keep" ? {} : windowFor(startIn, days)),
    });
  const chip = (on: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-xs font-semibold",
      on
        ? "border-primary bg-primary/15 text-primary-soft"
        : "border-border text-muted-foreground hover:text-foreground",
    );
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl">
          {draft.id ? "Edit leaderboard" : "New leaderboard"}
        </h1>
        <Button size="sm" variant="secondary" onClick={onClose}>
          Back
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Players who joined through your partner link or your promo code are ranked by how much they
        wager from deposited money during the board. Promo and bonus play does not count. You are
        not on the board. An admin approves it before it starts.
      </p>
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <label className="block text-sm">
          Name
          <input
            className={cn(control, "mt-1")}
            placeholder="Weekend race"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </label>
        {draft.name.trim().length > 0 && !nameOk ? (
          <p className="text-xs text-destructive">Use 3 to 60 characters.</p>
        ) : null}
        <div>
          <p className="text-sm">How long</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {lengths.map((days) => (
              <button
                key={days}
                type="button"
                className={chip(draft.lengthDays === days)}
                onClick={() =>
                  pickSchedule(draft.startIn === "keep" ? "soon" : draft.startIn, days)
                }
              >
                {days === 1 ? "1 day" : `${days} days`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm">Starts</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              className={chip(draft.startIn === "soon")}
              onClick={() => pickSchedule("soon", draft.lengthDays)}
            >
              In 15 minutes
            </button>
            <button
              type="button"
              className={chip(draft.startIn === "tomorrow")}
              onClick={() => pickSchedule("tomorrow", draft.lengthDays)}
            >
              Tomorrow
            </button>
          </div>
          {when ? <p className="mt-2 text-xs text-muted-foreground">{when}</p> : null}
        </div>
        <div>
          <p className="text-sm">Games that count</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {GAMES.filter((game) => template?.allowed_games.includes(game) ?? true).map((game) => {
              const on = draft.games.includes(game);
              return (
                <button
                  key={game}
                  type="button"
                  aria-pressed={on}
                  className={chip(on)}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      games: on
                        ? draft.games.filter((item) => item !== game)
                        : [...draft.games, game],
                    })
                  }
                >
                  {gameName(game)}
                </button>
              );
            })}
          </div>
          {!gamesOk ? (
            <p className="mt-2 text-xs text-destructive">Pick at least one game.</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <p className="text-sm">Prize pool</p>
          <p className="text-xs text-muted-foreground">
            Choose the total from {formatUsd(100)} to {formatUsd(poolCap)}. A single place pays the
            whole pool. Add places to split it.
          </p>
          {draft.tiers.map((tier, index) => (
            <label key={`${tier.rank_start}-${index}`} className="block text-xs">
              {placeName(tier.rank_start, tier.rank_end)}
              <span className="mt-1 flex items-center gap-2">
                <span className="flex h-9 min-w-0 flex-1 items-center rounded-md border border-border bg-background px-2">
                  <span className="text-muted-foreground">$</span>
                  <input
                    className="tabular h-full w-full bg-transparent px-1 text-sm outline-none"
                    inputMode="decimal"
                    value={tier.dollars}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        tiers: draft.tiers.map((item, i) =>
                          i === index ? { ...item, dollars: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </span>
                {draft.tiers.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setDraft({ ...draft, tiers: draft.tiers.filter((_, i) => i !== index) })
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </span>
            </label>
          ))}
          <Button
            size="sm"
            variant="secondary"
            disabled={template != null && draft.tiers.length >= template.max_tiers}
            onClick={() => {
              const last = Number(draft.tiers[draft.tiers.length - 1]?.rank_end ?? 0);
              setDraft({
                ...draft,
                tiers: [
                  ...draft.tiers,
                  { rank_start: String(last + 1), rank_end: String(last + 1), dollars: "" },
                ],
              });
            }}
          >
            Add next place
          </Button>
          <p className="text-sm tabular">
            Prize total {parsed.pool == null ? "—" : formatUsd(parsed.pool)}
            {` · ${formatUsd(100)} to ${formatUsd(poolCap)}`}
          </p>
          {!prizesOk ? (
            <p className="text-xs text-destructive">Enter a prize amount for every place.</p>
          ) : null}
          {prizesOk && !inRange ? (
            <p className="text-xs text-destructive">
              The prize pool must be from {formatUsd(100)} to {formatUsd(poolCap)}.
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !ready} onClick={onSubmit}>
          Submit for approval
        </Button>
        <Button size="sm" variant="secondary" disabled={busy || !ready} onClick={onSave}>
          Save draft
        </Button>
      </div>
    </div>
  );
}
