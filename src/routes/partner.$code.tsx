import { createFileRoute, Link } from "@tanstack/react-router";
import { openPartnerLink } from "@/lib/partner/acquire.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/partner/$code")({
  loader: ({ params }) => openPartnerLink({ data: { code: params.code } }),
  head: () => ({
    meta: [
      { title: "Partner link — PVPspinArena" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Create an account on PVPspinArena through a partner link." },
    ],
  }),
  component: PartnerLinkPage,
});

function PartnerLinkPage() {
  const data = Route.useLoaderData();
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <section className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
        {data.ok ? (
          <>
            <h1 className="font-display text-3xl uppercase">Play with {data.username.trim()}</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-foreground">
              Join their leaderboard and compete for rewards.
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
              {`Create your account through this partner link. Your eligible gameplay will be tracked toward ${data.username.trim()}’s leaderboard.`}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Your gameplay will be automatically linked to this partner. No balance is added by
              joining.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">Partner link</h1>
            <p className="mt-3 text-sm text-muted-foreground">This partner link is not valid.</p>
          </>
        )}
        <Button asChild className="mt-6 w-full sm:w-auto sm:min-w-44">
          <Link to="/auth" search={data.ok ? { mode: "signup" } : {}}>
            {data.ok ? "Join & Play" : "Go to sign in"}
          </Link>
        </Button>
      </section>
    </div>
  );
}
