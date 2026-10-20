import { cosmeticArtSrc } from "@/components/prestige/frames";
import { avatarSrc } from "@/lib/avatar";
import type { JackpotPaint } from "@/lib/first-paint";
import type { PlayerRow } from "@/lib/jackpot/api";
import type { HeadLink } from "@/lib/seo/indexable-head";

const PRELOAD_PLAYERS = 8;

function byStake(players: PlayerRow[]): PlayerRow[] {
  return [...players].sort(
    (a, b) => b.total_amount - a.total_amount || a.first_entry_at.localeCompare(b.first_entry_at),
  );
}

/** Preload the faces, frames, and crowns for the players already in the document. */
export function jackpotPlayerLinks(paint: JackpotPaint | undefined): HeadLink[] {
  const players = byStake(paint?.players?.data ?? []).slice(0, PRELOAD_PLAYERS);
  const identities = new Map((paint?.identities?.rows ?? []).map((row) => [row.user_id, row]));
  const links: HeadLink[] = [];
  const seen = new Set<string>();
  const add = (href: string | null, type?: string) => {
    if (!href || seen.has(href)) return;
    seen.add(href);
    links.push({
      rel: "preload",
      as: "image",
      href,
      ...(type ? { type } : {}),
      fetchPriority: "high",
    });
  };
  for (const player of players) {
    const avatar = avatarSrc(player.profiles?.avatar_url);
    add(avatar, avatar?.endsWith(".webp") ? "image/webp" : undefined);
    const identity = identities.get(player.user_id);
    add(cosmeticArtSrc(identity?.frame), "image/webp");
    add(cosmeticArtSrc(identity?.crown), "image/webp");
  }
  return links;
}
