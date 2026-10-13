import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LeaderboardIndex } from "@/components/leaderboard/PublicLeaderboards";
import { leaderboardCall, leaderboardError, type PublicListRow } from "@/lib/leaderboard/api";
import { Button } from "@/components/ui/button";

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;

export const Route = createFileRoute("/leaderboards/p/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} leaderboard — PVPspinArena` },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "This partner's wager race. Rankings use deposit-funded stakes only. Invite-attributed players are ranked.",
      },
    ],
  }),
  component: PartnerLeaderboardPage,
});

function PartnerLeaderboardPage() {
  const { username } = Route.useParams();
  const valid = USERNAME.test(username);
  const query = useQuery({
    queryKey: ["leaderboard-public-partner", username],
    networkMode: "always",
    retry: false,
    enabled: valid,
    queryFn: () =>
      leaderboardCall<PublicListRow[]>("leaderboard_public_partner", { p_username: username }),
  });

  if (!valid) {
    return (
      <p className="mx-auto mt-8 max-w-3xl px-4 text-sm text-muted-foreground">
        That partner link is not valid.
      </p>
    );
  }
  if (query.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6" aria-hidden>
        <div className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="mx-auto mt-8 max-w-3xl px-4">
        <p className="text-sm">{leaderboardError(query.error, "Unable to load this leaderboard.")}</p>
        <Button className="mt-3" size="sm" variant="secondary" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!query.data?.length) {
    return (
      <p className="mx-auto mt-8 max-w-3xl px-4 text-sm text-muted-foreground">
        No public leaderboard for this partner right now.
      </p>
    );
  }
  return <LeaderboardIndex rows={query.data} />;
}
