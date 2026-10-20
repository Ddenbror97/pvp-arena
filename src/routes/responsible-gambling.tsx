import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { indexableHead } from "@/lib/seo/indexable-head";
import { LegalPage } from "@/components/LegalPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/responsible-gambling")({
  head: () =>
    indexableHead({
      path: "/responsible-gambling",
      title: "Responsible Gambling: Budgets, Self-Exclusion and Help",
      description:
        "Responsible gambling on PVPspinArena: what Jackpot, Coinflip, Roulette, Slott and poker cost, how to budget or self-exclude, and where to get help.",
      crumb: "Responsible gambling",
    }),
  component: ResponsiblePage,
});

function ResponsiblePage() {
  return (
    <LegalPage title="Responsible Gambling">
      <p>
        <strong>Last updated October 20, 2026.</strong>
      </p>
      <p>
        Jackpot, Coinflip, Roulette, P2P Slott, and Poker are real-money games. They are not a way
        to make money or recover financial losses.
      </p>
      <p>
        Only play with money you can afford to lose, and stop if gambling stops feeling like
        entertainment.
      </p>

      <h2>What the Games Cost</h2>
      <p>
        Jackpot and Coinflip take a <strong>5% fee</strong> from the pot when the round settles. The
        winner receives the remaining 95%. P2P Slott takes a <strong>10% fee</strong> from the
        players&apos; pot when a player wins. The winner receives the remaining 90%, plus any
        promotional bonus added to that match. A draw refunds both stakes. If either player lands a
        bomb, the match ends and the house keeps both stakes.
      </p>
      <p>
        Roulette uses a 33-slot wheel (16 Purple, 16 Silver, 1 Green) that pays 2x on Purple and
        Silver and 14x on Green. A <strong>5% fee</strong> is then taken from each winning payout.
        After that fee, a Purple or Silver bet has a theoretical average return of about 92.12% of
        the stake, a <strong>7.88% house edge</strong>. A Green bet returns about 40.30%, a{" "}
        <strong>59.70% house edge</strong>.
      </p>
      <p>
        Poker is six-max No-Limit Hold&apos;em. The fee is <strong>5% of each pot</strong>, and only
        when a flop is dealt. A hand that ends before the flop pays no fee. Folding, calling, or
        raising does not remove that fee, and no betting pattern guarantees a profit.
      </p>
      <p>
        The <Link to="/terms">Terms</Link> explain the game rules and fees in more detail.
      </p>
      <p>
        A win does not change the cost of the next round. Increasing your stake to recover a
        previous loss can increase the amount you lose and the speed at which you lose it.
      </p>

      <h2>Before You Play</h2>
      <ul>
        <li>Set a spending limit before you start and stick to it.</li>
        <li>Do not deposit additional money simply to recover losses.</li>
        <li>Do not play with money needed for rent, food, bills, or other essential expenses.</li>
        <li>Do not play with borrowed money.</li>
        <li>
          Avoid gambling when you are upset, under the influence of alcohol or drugs, or trying to
          solve a financial problem.
        </li>
        <li>Take breaks and stop when you reach your personal limit.</li>
        <li>You must be 18 or older. Never allow anyone under 18 to use your account.</li>
      </ul>

      <h2>Self-Exclusion</h2>
      <p>
        If you want to stop using PVPspinArena, you can request self-exclusion for your account.
      </p>
      <SelfExclusionRequest />
      <p>
        Self-exclusion blocks the account from making deposits, placing wagers, and making
        withdrawals for the duration of the exclusion.
      </p>
      <p>Do not create or use another account to bypass a self-exclusion.</p>
      <p>
        Self-exclusion on PVPspinArena applies only to PVPspinArena. It does not prevent you from
        accessing other gambling services.
      </p>
      <p>
        If you need broader protection, consider using device or website blocking tools and any
        national, regional, or state self-exclusion programs available where you live.
      </p>

      <h2>Get Help</h2>
      <p>
        If gambling is causing financial, personal, or other harm, consider speaking with someone
        you trust and contacting a professional support service.
      </p>
      <p>Independent resources include:</p>
      <ul>
        <li>
          <strong>United States and Canada:</strong> <a href="tel:1-800-426-2537">1-800-GAMBLER</a>
        </li>
        <li>
          <strong>United States treatment referrals:</strong>{" "}
          <a
            href="https://www.samhsa.gov/find-help/national-helpline"
            target="_blank"
            rel="noopener noreferrer"
          >
            SAMHSA National Helpline
          </a>
        </li>
        <li>
          <strong>United Kingdom:</strong>{" "}
          <a href="https://www.gamcare.org.uk/" target="_blank" rel="noopener noreferrer">
            GamCare
          </a>
        </li>
        <li>
          <strong>International:</strong>{" "}
          <a href="https://www.gamblingtherapy.org/" target="_blank" rel="noopener noreferrer">
            Gambling Therapy
          </a>
          , which provides online support in multiple languages.
        </li>
      </ul>
      <p>You can also find practical information in our guides:</p>
      <ul>
        <li>
          <Link to="/guides/$slug" params={{ slug: "how-to-stop-gambling" }}>
            How to Stop Gambling
          </Link>
        </li>
        <li>
          <Link to="/guides/$slug" params={{ slug: "gambling-self-exclusion" }}>
            Gambling Self-Exclusion
          </Link>
        </li>
        <li>
          <Link to="/guides/$slug" params={{ slug: "gambling-budget" }}>
            Session Budget
          </Link>
        </li>
      </ul>
    </LegalPage>
  );
}

const EXCLUSION_PERIODS = [
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
  { days: 1825, label: "5 years" },
] as const;

function exclusionError(message: string) {
  if (message.includes("EXCLUSION_ALREADY_LONGER")) {
    return "This account is already excluded for longer than that. A shorter period is refused.";
  }
  if (message.includes("EXCLUSION_PERIOD")) return "Choose 6 months, 1 year, or 5 years.";
  if (message.includes("UNAUTHENTICATED")) return "Sign in again, then request the exclusion.";
  if (message.includes("NO_PROFILE")) return "Finish setting up your account first.";
  return "Couldn't request self-exclusion. Try again.";
}

function SelfExclusionRequest() {
  const { ready, userId } = useAuth();
  const queryClient = useQueryClient();
  const [days, setDays] = useState<(typeof EXCLUSION_PERIODS)[number]["days"]>(180);
  const [busy, setBusy] = useState(false);
  const status = useQuery({
    queryKey: ["account-status", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_account_status");
      if (error) throw error;
      const row = data as { self_excluded_until?: string | null } | null;
      return row?.self_excluded_until ?? null;
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const period = EXCLUSION_PERIODS.find((p) => p.days === days);
    if (!period) return;
    if (
      !window.confirm(
        `Self-exclude this account for ${period.label}? Deposits, wagers, and withdrawals stay blocked until then. This cannot be shortened.`,
      )
    )
      return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("request_self_exclusion", { p_days: days });
      if (error) throw error;
      const until = typeof data === "string" ? new Date(data).toLocaleString() : period.label;
      toast.success(`Self-exclusion is on until ${until}.`);
      await queryClient.invalidateQueries({ queryKey: ["account-status", userId] });
    } catch (err) {
      toast.error(exclusionError((err as { message?: string }).message ?? ""));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <p>Checking your account…</p>;
  }
  if (!userId) {
    return (
      <p>
        <Link to="/auth">Sign in</Link> to request self-exclusion for this account.
      </p>
    );
  }

  const until = status.data ? new Date(status.data) : null;
  const active = until != null && !Number.isNaN(until.getTime()) && until.getTime() > Date.now();

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-border bg-card p-4 text-foreground"
    >
      {status.isLoading ? (
        <p className="text-muted-foreground">Checking the current exclusion…</p>
      ) : status.isError ? (
        <p className="text-muted-foreground">The current exclusion could not be loaded.</p>
      ) : active && until ? (
        <p>
          This account is self-excluded until{" "}
          <time dateTime={status.data ?? undefined}>{until.toLocaleString()}</time>. A new request
          can only make that longer.
        </p>
      ) : (
        <p className="text-muted-foreground">This account is not self-excluded.</p>
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Exclusion length</legend>
        {EXCLUSION_PERIODS.map((period) => (
          <label key={period.days} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="exclusion-days"
              value={period.days}
              checked={days === period.days}
              onChange={() => setDays(period.days)}
            />
            {period.label}
          </label>
        ))}
      </fieldset>
      <Button type="submit" variant="destructive" size="sm" disabled={busy || status.isLoading}>
        {busy ? "Requesting…" : "Request self-exclusion"}
      </Button>
    </form>
  );
}
