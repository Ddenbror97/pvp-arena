import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useBrAccess } from "@/lib/fps/br/use-access";

/** Battle Royale is open to every signed-in player (public release 2026-11-09). */
export function BrAccessGate({ children }: { children: ReactNode }) {
  const { ready, userId } = useAuth();
  const access = useBrAccess();
  if (!ready || access.isPending) return <div className="p-8 text-center">Loading…</div>;
  if (userId && access.data === true) return children;
  return (
    <section className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">Battle Royale</h1>
      <p>Sign in to drop onto Project Island with up to 99 other players.</p>
      <Link to="/auth" className="strike-primary">
        Sign in
      </Link>
      <Link to="/fps-duel" className="strike-secondary">
        Back to PvPStrike
      </Link>
    </section>
  );
}
