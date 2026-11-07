import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useBrAccess } from "@/lib/fps/br/use-access";

export function BrAccessGate({ children }: { children: ReactNode }) {
  const { ready, userId } = useAuth();
  const access = useBrAccess();
  if (!ready || (!!userId && access.isPending))
    return <div className="p-8 text-center">Loading…</div>;
  if (userId && !access.isError && access.data === true) return children;
  return (
    <section className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="rounded-full border border-purple-400/40 px-4 py-1 text-sm text-purple-300">
        Coming soon
      </p>
      <h1 className="text-3xl font-bold">Battle Royale</h1>
      <p>Project Island is getting ready for launch.</p>
      <Link to="/fps-duel" className="strike-primary">
        Back to PvPStrike
      </Link>
    </section>
  );
}
