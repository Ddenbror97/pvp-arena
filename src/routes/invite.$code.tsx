import { createFileRoute, Link } from "@tanstack/react-router";
import { openInvite } from "@/lib/referral/referral.functions";
import { formatUsd } from "@/lib/jackpot/math";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invite/$code")({
  loader: ({ params }) => openInvite({ data: { code: params.code } }),
  head: () => ({
    meta: [
      { title: "You're invited — PVPspinArena" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Create an account on PVPspinArena with a friend's invite." },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const data = Route.useLoaderData();
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <section className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
        <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
          Invite
        </p>
        <h1 className="mt-2 font-display text-3xl">You're invited</h1>
        {data.ok ? (
          <>
            <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
              {data.username} invited you to PVPspinArena. Sign up with this link so their invite
              stays attached to your account.
            </p>
            <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
              After you deposit {formatUsd(data.deposit_cents)} and wager{" "}
              {formatUsd(data.play_cents)} on Jackpot, Coinflip, Roulette, Slott, or Poker,{" "}
              {data.username} earns their referral reward. This link does not add credit to your
              balance.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">This invite link is not valid.</p>
        )}
        <Button asChild className="mt-6 w-full sm:w-auto sm:min-w-44">
          <Link to="/auth" search={data.ok ? { mode: "signup" } : {}}>
            {data.ok ? "Create account" : "Go to sign in"}
          </Link>
        </Button>
      </section>
    </div>
  );
}
