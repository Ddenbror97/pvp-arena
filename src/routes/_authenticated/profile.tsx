import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { Button } from "@/components/ui/button";
import { WalletCard } from "@/components/wallet/WalletCard";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — PVPspinArena" },
      { name: "description", content: "Your PVPspinArena profile, avatar and jackpot stats." },
      { property: "og:title", content: "Profile — PVPspinArena" },
      { property: "og:description", content: "Your PVPspinArena profile, avatar and jackpot stats." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const STYLES = ["shapes", "rings", "glass", "identicon", "bottts-neutral", "thumbs"];

function ProfilePage() {
  const { profile, userId, refreshProfile, signOut } = useAuth();
  const wallet = useWallet(userId);
  const stats = useQuery({
    queryKey: ["stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_profile_stats", { p_user: userId! });
      if (error) throw error;
      return data as { games_played: number; games_won: number; total_wagered: number; total_won: number };
    },
  });

  async function pick(style: string) {
    if (!profile) return;
    const url = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(profile.username)}`;
    const { error } = await supabase.rpc("update_avatar", { p_avatar_url: url });
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    await refreshProfile();
  }

  if (!profile) return <p className="text-muted-foreground">Loading...</p>;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">
        <PlayerAvatar src={profile.avatar_url} name={profile.username} className="h-14 w-14 shrink-0 sm:h-20 sm:w-20" color="var(--primary)" />
        <div>
          <h1 className="truncate font-display text-lg sm:text-2xl">@{profile.username}</h1>
          <p className="text-sm text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={signOut}>Sign out</Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-5 sm:gap-3">
        {[
          ["Balance", formatUsd(wallet.data?.available ?? 0)],
          ["Games played", String(stats.data?.games_played ?? "—")],
          ["Games won", String(stats.data?.games_won ?? "—")],
          ["Total wagered", formatUsd(stats.data?.total_wagered ?? 0)],
          ["Total won", formatUsd(stats.data?.total_won ?? 0)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-3 last:col-span-2 sm:p-4 sm:last:col-span-1">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{k}</div>
            <div className="tabular mt-1 text-lg font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-6 font-display sm:mt-10 text-sm uppercase tracking-widest">Avatar</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {STYLES.map((s) => (
          <button key={s} onClick={() => pick(s)} className="rounded-full p-0.5 hover:ring-2 hover:ring-primary" aria-label={`Use ${s} avatar`}>
            <PlayerAvatar src={`https://api.dicebear.com/9.x/${s}/svg?seed=${encodeURIComponent(profile.username)}`} className="h-11 w-11 sm:h-14 sm:w-14" />
          </button>
        ))}
      </div>

      {userId && <WalletCard userId={userId} />}
    </div>
  );
}
