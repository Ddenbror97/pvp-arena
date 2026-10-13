import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { trackPrestigePage, type PrestigeState } from "@/lib/prestige/api";
import { equippedAssets, usePrestige } from "./PrestigeProvider";
import { PrestigeHero } from "./PrestigeHero";
import { PrestigeTimeline } from "./PrestigeTimeline";
import { CosmeticCollection } from "./CosmeticCollection";
import { Button } from "@/components/ui/button";
import { readAuthHint } from "@/lib/auth-hint";
import { PrestigeSkeleton } from "./PrestigeSkeleton";

export function PrestigePage() {
  const { profile, userId, ready } = useAuth();
  const { state, loading, error, reload } = usePrestige({ guest: true });
  const qc = useQueryClient();

  useEffect(() => {
    if (userId) void trackPrestigePage();
  }, [userId]);

  if (loading && !state)
    return <PrestigeSkeleton signedIn={ready ? Boolean(userId) : readAuthHint()} />;
  if (error || !state) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card px-6 py-10 text-center">
        <h1 className="font-display text-xl">Prestige temporarily unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">We couldn't load your progression.</p>
        <Button type="button" className="mt-5 min-h-11" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }

  const assets = equippedAssets(state);

  function onChange(next: PrestigeState) {
    qc.setQueryData(["prestige", userId], next);
    void qc.invalidateQueries({ queryKey: ["prestige-identities"] });
    void qc.invalidateQueries({ queryKey: ["wallet"] });
  }

  return (
    <div className="mx-auto max-w-[57.6rem] space-y-8">
      <PrestigeHero
        state={state}
        avatar={profile?.avatar_url}
        name={profile?.username}
        frame={assets.frame}
        crown={assets.crown}
      />
      <PrestigeTimeline state={state} />
      <CosmeticCollection
        state={state}
        avatar={profile?.avatar_url}
        name={profile?.username}
        frame={assets.frame}
        crown={assets.crown}
        onChange={onChange}
      />
    </div>
  );
}
