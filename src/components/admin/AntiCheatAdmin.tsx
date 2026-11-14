import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminErrorCopy } from "@/lib/admin/ops";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * PvPStrike anti-cheat console (migration 20261114030000): flagged players and their evidence
 * families, restrictions (active, expired, recorded in shadow mode), appeals, the audit trail of
 * every automatic and manual decision; the rollout mode and the safety switch. Every action
 * asks for a note and is written to the audit trail. Admin role and PIN step-up are checked by
 * each database function, not here.
 */
type Families = {
  aim?: number;
  tracking?: number;
  canary?: number;
  protocol?: number;
  canary_log_e?: number;
};
type Account = {
  user_id: string;
  username: string | null;
  level: number;
  families: Families;
  matches: number;
  modes: string[];
  canary: { decisive: number; won: number; log_e: number };
  protocol: { matches: number; rejects: number };
  updated_at: string;
  cleared_at: string | null;
};
type Restriction = {
  id: string;
  user_id: string;
  username: string | null;
  kind: "competitive" | "ban";
  level: number;
  starts_at: string;
  ends_at: string | null;
  enforced: boolean;
  source: "auto" | "admin";
  reason: string;
  status: "active" | "expired" | "revoked" | "recorded";
  created_at: string;
  revoke_note: string | null;
  evidence: { families?: Families; matches?: number };
};
type Appeal = {
  id: string;
  restriction_id: string;
  user_id: string;
  username: string | null;
  message: string;
  status: "open" | "upheld" | "overturned";
  created_at: string;
  decision_note: string | null;
};
type AuditEvent = {
  id: number;
  user_id: string | null;
  username: string | null;
  kind: string;
  level: number | null;
  automated: boolean;
  detail: Record<string, unknown>;
  created_at: string;
};
type Overview = {
  config: {
    mode: "shadow" | "validated" | "full";
    safety_tripped_at: string | null;
    safety_reason: string | null;
    updated_at: string;
  };
  counts: Record<"flagged" | "high" | "restricted" | "would" | "appeals_open" | "auto_24h", number>;
  accounts: Account[];
  restrictions: Restriction[];
  appeals: Appeal[];
  events: AuditEvent[];
};
type Filter = { mode: string; q: string; from: string; to: string; min_level: string };

const LEVEL = ["Clear", "Suspicious", "High suspicion", "High confidence", "Confirmed"];
const MODE_COPY = {
  shadow: "Shadow: decisions are recorded, nobody is restricted.",
  validated: "Validated: temporary competitive restrictions are enforced; bans are recorded only.",
  full: "Full: restrictions and bans are enforced automatically.",
} as const;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";
const control = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
}

function levelBadge(level: number) {
  const color =
    level >= 4
      ? "bg-destructive/20 text-destructive"
      : level === 3
        ? "bg-destructive/10 text-destructive"
        : level === 2
          ? "bg-gold/20 text-gold"
          : level === 1
            ? "bg-gold/10 text-gold"
            : "bg-secondary text-muted-foreground";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", color)}>
      L{level} {LEVEL[level]}
    </span>
  );
}

function families(f: Families | undefined) {
  if (!f) return "—";
  const part = (label: string, v: number | undefined) =>
    v ? (
      <span key={label} className={cn("mr-2", v >= 3 ? "text-destructive" : "text-gold")}>
        {label} {v}
      </span>
    ) : null;
  const parts = [
    part("aim", f.aim),
    part("tracking", f.tracking),
    part("canary", f.canary),
    part("protocol", f.protocol),
  ].filter(Boolean);
  return parts.length ? parts : <span className="text-muted-foreground">none</span>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="text-muted-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-2 py-1 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function AntiCheatAdmin() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>({
    mode: "",
    q: "",
    from: "",
    to: "",
    min_level: "1",
  });
  const [applied, setApplied] = useState<Filter>(filter);
  const [player, setPlayer] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["admin-anticheat", applied],
    queryFn: () =>
      rpc<Overview>("fps_ac_admin_overview", {
        p_filter: {
          ...applied,
          from: applied.from ? new Date(applied.from).toISOString() : "",
          to: applied.to ? new Date(applied.to).toISOString() : "",
        },
      }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-anticheat"] });

  async function act(
    action: string,
    target: string,
    label: string,
    extra: { days?: number | null; kind?: string } = {},
  ) {
    const note = window.prompt(`${label}: reason (kept in the audit trail)`);
    if (!note || note.trim().length < 3) return;
    try {
      await rpc("fps_ac_admin_act", {
        p_action: action,
        p_target: target,
        p_note: note.trim(),
        p_days: extra.days ?? null,
        p_kind: extra.kind ?? "competitive",
      });
      toast.success(`${label}: done.`);
      await refresh();
    } catch (e) {
      toast.error(adminErrorCopy("Anti-cheat", e));
    }
  }

  async function setMode(mode: Overview["config"]["mode"], reset: boolean) {
    const note = window.prompt(
      reset ? "Reset the safety switch: reason" : `Switch to ${mode} mode: reason`,
    );
    if (!note || note.trim().length < 3) return;
    try {
      await rpc("fps_ac_admin_config", {
        p_mode: mode,
        p_reset_safety: reset,
        p_note: note.trim(),
      });
      toast.success("Saved.");
      await refresh();
    } catch (e) {
      toast.error(adminErrorCopy("Anti-cheat", e));
    }
  }

  const days = (label: string, fallback: string) => {
    const raw = window.prompt(`${label}: days (blank = permanent)`, fallback);
    if (raw === null) return undefined;
    if (raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= 3650 ? n : undefined;
  };

  if (q.isError)
    return <p className="text-sm text-destructive">{adminErrorCopy("Anti-cheat", q.error)}</p>;
  const o = q.data;
  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filter);
        }}
      >
        <label className="flex flex-col gap-1 text-[11px] uppercase text-muted-foreground">
          Mode
          <select
            className={control}
            value={filter.mode}
            onChange={(e) => setFilter({ ...filter, mode: e.target.value })}
          >
            <option value="">All</option>
            <option value="duel">1v1</option>
            <option value="bomb">5v5 Defuse</option>
            <option value="br">Battle Royale</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase text-muted-foreground">
          Player
          <input
            className={control}
            placeholder="Username or id"
            value={filter.q}
            onChange={(e) => setFilter({ ...filter, q: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase text-muted-foreground">
          From
          <input
            type="date"
            className={control}
            value={filter.from}
            onChange={(e) => setFilter({ ...filter, from: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase text-muted-foreground">
          To
          <input
            type="date"
            className={control}
            value={filter.to}
            onChange={(e) => setFilter({ ...filter, to: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase text-muted-foreground">
          Severity
          <select
            className={control}
            value={filter.min_level}
            onChange={(e) => setFilter({ ...filter, min_level: e.target.value })}
          >
            {[1, 2, 3, 4].map((l) => (
              <option key={l} value={l}>
                L{l}+ {LEVEL[l]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm">
          Apply
        </Button>
      </form>

      {!o ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ["Flagged", o.counts.flagged],
                ["High suspicion+", o.counts.high],
                ["Restricted now", o.counts.restricted],
                ["Recorded (7 d)", o.counts.would],
                ["Open appeals", o.counts.appeals_open],
                ["Automatic (24 h)", o.counts.auto_24h],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="rounded-lg border border-border bg-card p-3">
                <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
                <div className="text-xl font-semibold tabular-nums">{n}</div>
              </div>
            ))}
          </div>

          <Section title="Enforcement">
            <p className="mb-2 text-sm">{MODE_COPY[o.config.mode]}</p>
            {o.config.safety_tripped_at && (
              <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Safety switch tripped {when(o.config.safety_tripped_at)} ({o.config.safety_reason}):
                nothing new is enforced until it is reset.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {(["shadow", "validated", "full"] as const).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={o.config.mode === m ? "default" : "secondary"}
                  onClick={() => void setMode(m, false)}
                >
                  {m[0]!.toUpperCase() + m.slice(1)}
                </Button>
              ))}
              {o.config.safety_tripped_at && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => void setMode(o.config.mode, true)}
                >
                  Reset safety switch
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Thresholds are not calibrated on real players yet: keep Shadow until the recorded
              decisions have been reviewed.
            </p>
          </Section>

          <Section title="Flagged players">
            <Table
              head={["Player", "Level", "Evidence", "Canary", "Protocol", "Matches", "Updated", ""]}
            >
              {o.accounts.map((a) => (
                <tr key={a.user_id}>
                  <td className="px-2 py-1">{a.username ?? a.user_id.slice(0, 8)}</td>
                  <td className="px-2 py-1">{levelBadge(a.level)}</td>
                  <td className="px-2 py-1">{families(a.families)}</td>
                  <td className="px-2 py-1 tabular-nums">
                    {a.canary.won}/{a.canary.decisive} · ln e {a.canary.log_e}
                  </td>
                  <td className="px-2 py-1 tabular-nums">
                    {a.protocol.matches} m · {a.protocol.rejects}
                  </td>
                  <td className="px-2 py-1 tabular-nums">
                    {a.matches} <span className="text-muted-foreground">{a.modes.join(", ")}</span>
                  </td>
                  <td className="px-2 py-1">{when(a.updated_at)}</td>
                  <td className="px-2 py-1">
                    <Button size="sm" variant="secondary" onClick={() => setPlayer(a.user_id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
              {!o.accounts.length && (
                <tr>
                  <td colSpan={8} className="px-2 py-3 text-muted-foreground">
                    Nobody at this level.
                  </td>
                </tr>
              )}
            </Table>
          </Section>

          {player && <PlayerFile id={player} close={() => setPlayer(null)} act={act} days={days} />}

          <Section title="Restrictions and bans">
            <Table head={["Player", "Kind", "Status", "From", "Until", "Source", "Evidence", ""]}>
              {o.restrictions.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-1">{r.username ?? r.user_id.slice(0, 8)}</td>
                  <td className="px-2 py-1">
                    {r.kind === "ban" ? "Ban" : "Competitive"} {levelBadge(r.level)}
                  </td>
                  <td className="px-2 py-1">{r.status}</td>
                  <td className="px-2 py-1">{when(r.starts_at)}</td>
                  <td className="px-2 py-1">{r.ends_at ? when(r.ends_at) : "Permanent"}</td>
                  <td className="px-2 py-1">
                    {r.source} · {r.reason}
                  </td>
                  <td className="px-2 py-1">{families(r.evidence.families)}</td>
                  <td className="flex gap-1 px-2 py-1">
                    {(r.status === "active" || r.status === "recorded") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void act("revoke", r.id, "Unban")}
                      >
                        Unban
                      </Button>
                    )}
                    {r.status !== "revoked" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const d = days("Extend (and enforce)", "7");
                          if (d !== undefined) void act("extend", r.id, "Extend", { days: d });
                        }}
                      >
                        Extend
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </Section>

          <Section title="Appeals">
            <Table head={["Player", "Filed", "Message", "Status", ""]}>
              {o.appeals.map((ap) => (
                <tr key={ap.id}>
                  <td className="px-2 py-1">{ap.username ?? ap.user_id.slice(0, 8)}</td>
                  <td className="px-2 py-1">{when(ap.created_at)}</td>
                  <td className="max-w-md whitespace-pre-wrap px-2 py-1">{ap.message}</td>
                  <td className="px-2 py-1">
                    {ap.status}
                    {ap.decision_note ? ` · ${ap.decision_note}` : ""}
                  </td>
                  <td className="flex gap-1 px-2 py-1">
                    {ap.status === "open" && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void act("overturn", ap.id, "Accept appeal")}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void act("uphold", ap.id, "Reject appeal")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </Section>

          <Section title="Audit trail">
            <Table head={["When", "Player", "What", "Level", "By", "Detail"]}>
              {o.events.map((e) => (
                <tr key={e.id}>
                  <td className="px-2 py-1">{when(e.created_at)}</td>
                  <td className="px-2 py-1">{e.username ?? e.user_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-2 py-1">{e.kind}</td>
                  <td className="px-2 py-1">{e.level ?? ""}</td>
                  <td className="px-2 py-1">{e.automated ? "automatic" : "admin"}</td>
                  <td
                    className="max-w-md truncate px-2 py-1 font-mono text-[10px]"
                    title={JSON.stringify(e.detail)}
                  >
                    {JSON.stringify(e.detail)}
                  </td>
                </tr>
              ))}
            </Table>
          </Section>
        </>
      )}
    </div>
  );
}

type PlayerData = {
  account: (Account & Record<string, unknown>) | null;
  evidence: Array<{
    id: number;
    match_id: string;
    mode: string;
    created_at: string;
    aim_level: number;
    tracking_level: number;
    canary_trials: number;
    canary_decisive: number;
    canary_won: number;
    protocol_rejects: number;
    detail: Record<string, unknown>;
  }>;
};

function PlayerFile({
  id,
  close,
  act,
  days,
}: {
  id: string;
  close: () => void;
  act: (
    action: string,
    target: string,
    label: string,
    extra?: { days?: number | null; kind?: string },
  ) => Promise<void>;
  days: (label: string, fallback: string) => number | null | undefined;
}) {
  const q = useQuery({
    queryKey: ["admin-anticheat-player", id],
    queryFn: () => rpc<PlayerData>("fps_ac_admin_player", { p_user: id }),
  });
  const d = q.data;
  return (
    <Section title={`Player file · ${(d?.account?.username as string | undefined) ?? id}`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const n = days("Restrict competitive play", "7");
            if (n !== undefined)
              void act("restrict", id, "Restrict", { days: n, kind: "competitive" });
          }}
        >
          Restrict competitive
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            const n = days("Ban from PvPStrike", "30");
            if (n !== undefined) void act("restrict", id, "Ban", { days: n, kind: "ban" });
          }}
        >
          Ban
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void act("clear", id, "Clear evidence")}
        >
          Clear evidence
        </Button>
        <Button size="sm" variant="ghost" onClick={close}>
          Close
        </Button>
      </div>
      {!d ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Table head={["Match", "Mode", "When", "Aim", "Tracking", "Canary", "Protocol", "Detail"]}>
          {d.evidence.map((e) => (
            <tr key={e.id}>
              <td className="px-2 py-1 font-mono text-[10px]">{e.match_id.slice(0, 8)}</td>
              <td className="px-2 py-1">{e.mode}</td>
              <td className="px-2 py-1">{when(e.created_at)}</td>
              <td className="px-2 py-1">{e.aim_level}</td>
              <td className="px-2 py-1">{e.tracking_level}</td>
              <td className="px-2 py-1 tabular-nums">
                {e.canary_won}/{e.canary_decisive} of {e.canary_trials}
              </td>
              <td className="px-2 py-1">{e.protocol_rejects}</td>
              <td
                className="max-w-md truncate px-2 py-1 font-mono text-[10px]"
                title={JSON.stringify(e.detail)}
              >
                {JSON.stringify(e.detail)}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Section>
  );
}
