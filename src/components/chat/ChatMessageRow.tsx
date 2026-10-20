import {
  PlayerPrestigeIdentity,
  reservedCrownHeadroom,
} from "@/components/prestige/PlayerPrestigeIdentity";
import type { PrestigeIdentity } from "@/lib/prestige/api";
import type { ChatMessage } from "@/lib/chat/messages";
import { cn } from "@/lib/utils";

export const CHAT_AVATAR = 32;
/** Reserved on every row, crowned or not, so identities cannot change the line height. */
export const CHAT_HEADROOM = reservedCrownHeadroom(CHAT_AVATAR);

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Plain-text row: user content is only ever rendered as React text nodes. */
export function ChatMessageRow({
  m,
  mine,
  identity,
}: {
  m: ChatMessage;
  mine: boolean;
  identity?: PrestigeIdentity | undefined;
}) {
  return (
    <li className="flex items-start gap-2.5 px-3.5 py-1.5">
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
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "max-w-[10rem] truncate text-xs font-semibold",
              mine ? "text-primary-soft" : "text-foreground",
            )}
          >
            {m.display_name}
          </span>
          <time
            suppressHydrationWarning
            className="tabular inline-block w-[4.75rem] shrink-0 text-right text-[11px] text-muted-foreground"
            dateTime={m.created_at}
          >
            {time(m.created_at)}
          </time>
        </div>
        <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-foreground/90 [overflow-wrap:anywhere]">
          {m.message}
        </p>
      </div>
    </li>
  );
}
