import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet, useWalletRealtime, walletQuery } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { PlayerPrestigeIdentity } from "@/components/prestige/PlayerPrestigeIdentity";
import { equippedAssets, prestigeQuery, usePrestige } from "@/components/prestige/PrestigeProvider";
import { Button } from "@/components/ui/button";
import { AvatarManager } from "@/components/avatar/AvatarManager";
import { InvitePanel, referralDashboardQuery } from "@/components/referral/InvitePanel";
import { PromoCodePanel } from "@/components/promo/PromoCodePanel";
import { leaderboardCall } from "@/lib/leaderboard/api";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — PVPspinArena" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Your PVPspinArena profile, avatar and jackpot stats." },
      { property: "og:title", content: "Profile — PVPspinArena" },
      {
        property: "og:description",
        content: "Your PVPspinArena profile, avatar and jackpot stats.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  // Not awaited: starts every panel's request at navigation (or on hover) instead
  // of after the page chunk loads and mounts, without holding the old page.
  loader: ({ context }) => {
    const qc = context.queryClient;
    const uid = context.user.id;
    for (const q of [
      walletQuery(uid),
      statsQuery(uid),
      adminRoleQuery(uid),
      prestigeQuery(uid),
      referralDashboardQuery(),
    ]) {
      void qc.prefetchQuery(q as never);
    }
  },
  component: ProfilePage,
});

const statsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["stats", userId],
    staleTime: 10_000,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_profile_stats", { p_user: userId });
      if (error) throw error;
      return data as {
        games_played: number;
        games_won: number;
        total_wagered: number;
        total_won: number;
      };
    },
  });

const adminRoleQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-admin-role", userId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return data?.role === "admin";
    },
  });

function ProfilePage() {
  const { profile, userId, refreshProfile, signOut: doSignOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const wallet = useWallet(userId);
  useWalletRealtime(userId);
  const prestige = usePrestige();
  const style = equippedAssets(prestige.state);

  async function signOut() {
    await queryClient.cancelQueries();
    await doSignOut();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }
  const isAdmin = useQuery({ ...adminRoleQuery(userId ?? ""), enabled: !!userId });
  const leaderboardAccess = useQuery({
    queryKey: ["leaderboard-access", userId],
    networkMode: "always",
    enabled: !!userId,
    retry: false,
    queryFn: () => leaderboardCall<{ partner: boolean }>("leaderboard_my_access"),
  });
  const stats = useQuery({ ...statsQuery(userId ?? ""), enabled: !!userId });

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {!profile ? (
        <div className="flex h-[62px] items-center gap-3" aria-busy="true">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-[8%] bg-muted" />
          <div className="h-10 min-w-0 flex-1 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <PlayerPrestigeIdentity
              avatar={profile.avatar_url}
              name={profile.username}
              frame={style.frame}
              crown={style.crown}
              level={prestige.state?.level}
              tier={prestige.state?.tier}
              size={56}
            />
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg">@{profile.username}</h1>
              <p className="truncate text-xs text-muted-foreground">
                {prestige.state ? `${prestige.state.tier} · Level ${prestige.state.level} · ` : null}
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
          <nav aria-label="Account" className="flex flex-wrap gap-x-3 gap-y-1">
            <Link to="/prestige" className="whitespace-nowrap text-xs text-primary hover:underline">
              Your prestige
            </Link>
            <Link
              to="/profile/security"
              className="whitespace-nowrap text-xs text-primary hover:underline"
            >
              Security
            </Link>
            {isAdmin.data && (
              <Link
                to="/admin"
                search={{ section: "overview" }}
                className="whitespace-nowrap text-xs text-primary hover:underline"
              >
                Admin panel
              </Link>
            )}
            {leaderboardAccess.data?.partner && (
              <Link
                to="/partner/leaderboards"
                className="whitespace-nowrap text-xs text-primary hover:underline"
              >
                Leaderboards
              </Link>
            )}
          </nav>
        </div>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
        {[
          ["Balance", wallet.isLoading ? "\u00a0" : formatUsd(wallet.data?.available ?? 0)],
          ["Played", stats.isLoading ? "\u00a0" : String(stats.data?.games_played ?? 0)],
          ["Wins", stats.isLoading ? "\u00a0" : String(stats.data?.games_won ?? 0)],
          ["Wagered", stats.isLoading ? "\u00a0" : formatUsd(stats.data?.total_wagered ?? 0)],
          ["Won", stats.isLoading ? "\u00a0" : formatUsd(stats.data?.total_won ?? 0)],
        ].map(([k, v]) => (
          <div key={k} className="bg-card px-2.5 py-2 last:col-span-2 sm:last:col-span-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="tabular mt-0.5 h-5 truncate text-sm font-semibold leading-none">
              {v}
            </div>
          </div>
        ))}
      </div>

      <InvitePanel />
      <PromoCodePanel />

      <div id="avatar" className="scroll-mt-20">
        <AvatarManager
          frame={style.frame}
          crown={style.crown}
          level={prestige.state?.level}
          tier={prestige.state?.tier}
        />
      </div>

    </div>
  );
}
