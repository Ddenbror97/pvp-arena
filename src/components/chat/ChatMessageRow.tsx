import type { ChatMessage } from "@/lib/chat/messages";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { cn } from "@/lib/utils";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Plain-text row: user content is only ever rendered as React text nodes. */
export function ChatMessageRow({ m, mine }: { m: ChatMessage; mine: boolean }) {
  return (
    <li className="flex gap-2 px-3 py-1.5">
      <PlayerAvatar src={m.avatar_url} name={m.display_name} className="mt-0.5 h-6 w-6 ring-1" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "max-w-[10rem] truncate text-xs font-semibold",
              mine ? "text-primary" : "text-foreground",
            )}
          >
            {m.display_name}
          </span>
          <time
            className="tabular shrink-0 text-[10px] text-muted-foreground"
            dateTime={m.created_at}
          >
            {time(m.created_at)}
          </time>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-snug text-foreground/90 [overflow-wrap:anywhere]">
          {m.message}
        </p>
      </div>
    </li>
  );
}
