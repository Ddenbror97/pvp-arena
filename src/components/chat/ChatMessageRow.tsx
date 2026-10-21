import {
  PlayerPrestigeIdentity,
  reservedCrownHeadroom,
} from "@/components/prestige/PlayerPrestigeIdentity";
import type { PrestigeIdentity } from "@/lib/prestige/api";
import { chatClock } from "@/lib/chat/time";
import type { ChatMessage } from "@/lib/chat/messages";
import { cn } from "@/lib/utils";

export const CHAT_AVATAR = 32;
/** Reserved on every row, crowned or not, so identities cannot change the line height. */
export const CHAT_HEADROOM = reservedCrownHeadroom(CHAT_AVATAR);

/** Plain-text row: user content is only ever rendered as React text nodes. */
export function ChatMessageRow({
  m,
  mine,
  identity,
  continued = false,
}: {
  m: ChatMessage;
  mine: boolean;
  identity?: PrestigeIdentity | undefined;
  /** Same player, same burst: keep the name and clock on the first line only. */
  continued?: boolean;
}) {
  return (
    <li className={cn("flex items-start gap-2.5 px-3.5", continued ? "pb-1" : "pt-2 pb-1")}>
      {continued ? (
        <span className="shrink-0" style={{ width: CHAT_AVATAR }} aria-hidden />
      ) : (
        <PlayerPrestigeIdentity
          avatar={m.avatar_url}
          name={m.display_name}
          frame={identity?.frame}
          crown={identity?.crown}
          level={identity?.level}
          tier={identity?.tier}
          size={CHAT_AVATAR}
          minHeadroom={CHAT_HEADROOM}
        />
      )}
      <div className="min-w-0 flex-1">
        {continued ? null : (
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span
              className={cn(
                "min-w-0 truncate text-xs font-semibold",
                mine ? "text-primary-soft" : "text-foreground",
              )}
            >
              {m.display_name}
            </span>
            <time
              suppressHydrationWarning
              className="shrink-0 text-[10px] leading-none text-muted-foreground tabular-nums"
              dateTime={m.created_at}
            >
              {chatClock(m.created_at)}
            </time>
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-foreground/90 [overflow-wrap:anywhere]">
          {m.message}
        </p>
      </div>
    </li>
  );
}
