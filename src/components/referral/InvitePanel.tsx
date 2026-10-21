import { useEffect, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatUsd } from "@/lib/jackpot/math";
import { Button } from "@/components/ui/button";

type Row = { username: string; status: string; reward_cents: number; created_at: string };
type Dashboard = {
  code: string | null;
  deposit_cents: number;
  play_cents: number;
  reward_cents: number;
  invited: number;
  qualified: number;
  earned_cents: number;
  pending_cents: number;
  playthrough_left_cents: number;
  rows: Row[];
};

function referralStatusLabel(status: string, depositCents: number): string {
  switch (status) {
    case "SIGNED_UP":
      return "Signed up";
    case "DEPOSIT_PENDING":
      return `Awaiting ${formatUsd(depositCents)} deposit`;
    case "DEPOSIT_QUALIFIED":
      return "Deposit complete";
    case "PLAY_REQUIREMENT_PENDING":
      return "Playing";
    case "QUALIFIED":
      return "Qualified";
    case "REWARD_PENDING":
      return "Reward pending";
    case "REWARDED":
      return "Rewarded";
    case "FRAUD_REVIEW":
      return "In review";
    case "INVALID":
      return "Invalid";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

async function loadDashboard(): Promise<Dashboard> {
  const { data, error } = await supabase.rpc("referral_dashboard" as never);
  if (error) throw error;
  return data as Dashboard;
}

export const referralDashboardQuery = () =>
  queryOptions({ queryKey: ["referral-dashboard"], queryFn: loadDashboard, staleTime: 10_000 });

export function InvitePanel() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("https://pvpspinarena.com");
  const [canShare, setCanShare] = useState(false);
  const dash = useQuery(referralDashboardQuery());

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  const code = dash.data?.code ?? null;
  const link = code ? `${origin}/invite/${code}` : "";
  const depositCents = dash.data?.deposit_cents ?? 5000;
  const playCents = dash.data?.play_cents ?? 500;
  const rewardCents = dash.data?.reward_cents ?? 1000;

  async function ensureCode() {
    if (code) return code;
    setBusy(true);
    const { data, error } = await supabase.rpc("referral_create_invite" as never);
    setBusy(false);
    if (error) {
      toast.error("Couldn't create your invite link.");
      return null;
    }
    const next = (data as { code?: string } | null)?.code ?? null;
    await queryClient.invalidateQueries({ queryKey: ["referral-dashboard"] });
    return next;
  }

  async function copy() {
    const next = await ensureCode();
    const url = next ? `${origin}/invite/${next}` : "";
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied.");
  }

  async function share() {
    const next = await ensureCode();
    const url = next ? `${origin}/invite/${next}` : "";
    if (!url || !navigator.share) return;
    await navigator.share({ title: "PVPspinArena", url });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-sm">Invite a friend</h2>
        <p className="text-xs font-medium">{formatUsd(rewardCents)} per qualifying friend</p>
      </div>
      {!dash.isLoading ? (
        <ol className="mt-2 space-y-1 text-xs leading-snug text-muted-foreground">
          <li>
            <span className="text-foreground">1.</span> They create an account with your link.
          </li>
          <li>
            <span className="text-foreground">2.</span> They complete a{" "}
            <span className="text-foreground">{formatUsd(depositCents)}</span> deposit.
          </li>
          <li>
            <span className="text-foreground">3.</span> When they wager {formatUsd(playCents)} on
            Jackpot, Coinflip, Roulette, Slott, or Poker, you earn {formatUsd(rewardCents)}.
          </li>
        </ol>
      ) : (
        <p className="mt-2 h-10" aria-hidden />
      )}
      {dash.data && dash.data.playthrough_left_cents > 0 ? (
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Referral rewards in your balance need {formatUsd(dash.data.playthrough_left_cents)} more
          play before withdrawal.
        </p>
      ) : null}
      {dash.isLoading ? (
        <p className="mt-2 h-4" aria-hidden />
      ) : link ? (
        <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">{link}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void copy()}
          disabled={busy || dash.isLoading}
        >
          Copy invite link
        </Button>
        {canShare ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void share()}
            disabled={busy || dash.isLoading}
          >
            Share
          </Button>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-2">
        <Stat label="Invited" value={dash.data ? String(dash.data.invited) : "\u00a0"} />
        <Stat label="Qualified" value={dash.data ? String(dash.data.qualified) : "\u00a0"} />
        <Stat label="Earned" value={dash.data ? formatUsd(dash.data.earned_cents) : "\u00a0"} />
        <Stat label="Pending" value={dash.data ? formatUsd(dash.data.pending_cents) : "\u00a0"} />
      </div>
      {dash.data && dash.data.rows.length > 0 ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-1 font-medium">Referral</th>
                <th className="py-1 font-medium">Status</th>
                <th className="py-1 text-right font-medium">Reward</th>
              </tr>
            </thead>
            <tbody>
              {dash.data.rows.map((row) => (
                <tr key={row.created_at + row.username} className="border-t border-border">
                  <td className="py-1">{row.username}</td>
                  <td className="py-1">{referralStatusLabel(row.status, depositCents)}</td>
                  <td className="py-1 text-right tabular">
                    {row.status === "REWARDED" ? formatUsd(row.reward_cents) : "Pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="tabular mt-0.5 h-4 truncate font-semibold leading-none">{value}</div>
    </div>
  );
}
