import {
  Fragment,
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { readAuthHint } from "@/lib/auth-hint";
import { useGameChat } from "@/lib/chat/api";
import type { ChatMessage } from "@/lib/chat/messages";
import { sendChatMessage } from "@/lib/chat/chat.functions";
import { CHAT_CONFIG, SHARED_CHAT_ROOM, type ChatRoom } from "@/lib/chat/config";
import { chatDayKey, chatDayLabel, continuesPlayerTurn } from "@/lib/chat/time";
import { chatMessageFor } from "@/lib/chat/errors";
import { CHAT_AVATAR, CHAT_HEADROOM, ChatMessageRow } from "./ChatMessageRow";
import { usePrestigeIdentities } from "@/components/prestige/PrestigeProvider";
import { cn } from "@/lib/utils";

export { ChatMessageRow };

/** Rows rendered in the navigation commit; the rest follow in a background transition. */
const FIRST_COMMIT_ROWS = 16;
const noopSubscribe = () => () => {};

export function GameChat({
  className,
  initial,
  bare = false,
}: {
  gameType: ChatRoom;
  className?: string;
  /** Drops the "Live chat" header when the host already labels the panel. */
  bare?: boolean;
  /** Messages already rendered into the page, so the list is not a skeleton on first paint. */
  initial?: { data: ChatMessage[] } | null;
}) {
  // Every game page shows the same shared chat.
  const gameType = SHARED_CHAT_ROOM;
  const { userId, profile, ready } = useAuth();
  const [hint] = useState(readAuthHint);
  const signedOut = !userId && (ready || !hint);
  const logId = `chat-log-${gameType}`;
  const { messages, historyLoaded, status, hasMore, loadingOlder, loadOlder } = useGameChat(
    gameType,
    userId,
    initial,
  );
  // False while hydrating server HTML (which already holds every row), true for client mounts.
  const clientMount = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [windowed, setWindowed] = useState(clientMount);
  useEffect(() => {
    if (!windowed) return;
    const t = setTimeout(() => startTransition(() => setWindowed(false)), 0);
    return () => clearTimeout(t);
  }, [windowed]);
  const shown = windowed ? messages.slice(-FIRST_COMMIT_ROWS) : messages;
  const identities = usePrestigeIdentities(messages.map((m) => m.user_id));
  const send = useServerFn(sendChatMessage);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unseen, setUnseen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const prevLast = useRef<string | undefined>(undefined);
  const prevFirst = useRef<string | undefined>(undefined);
  const prevHeight = useRef(0);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const first = shown[0]?.id;
    const last = shown[shown.length - 1]?.id;
    if (first !== prevFirst.current && last === prevLast.current && prevHeight.current) {
      // Older page prepended: keep the reader's position.
      el.scrollTop += el.scrollHeight - prevHeight.current;
    } else if (last !== prevLast.current) {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
      else if (prevLast.current) setUnseen(true);
    } else if (atBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevFirst.current = first;
    prevLast.current = last;
    prevHeight.current = el.scrollHeight;
  }, [shown]);

  // Rows and the composer keep a constant box. This only follows a real new line.
  useLayoutEffect(() => {
    const el = listRef.current;
    const content = contentRef.current;
    if (!el || !content) return;
    const pin = () => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    };
    const ro = new ResizeObserver(pin);
    ro.observe(content);
    ro.observe(el);
    pin();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    atBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < CHAT_CONFIG.stickToBottomPx;
    if (atBottom.current) setUnseen(false);
    prevHeight.current = el.scrollHeight;
    if (el.scrollTop < 40 && hasMore && !loadingOlder && !windowed) void loadOlder();
  };
  const jump = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottom.current = true;
    setUnseen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if ([...trimmed].length > CHAT_CONFIG.maxLength)
      return setError(chatMessageFor("CHAT_TOO_LONG"));
    setSending(true);
    setError(null);
    try {
      const r = await send({ data: { game_type: gameType, message: trimmed } });
      if (r.ok) {
        setText("");
        atBottom.current = true;
      } else setError(chatMessageFor(r.code));
    } catch {
      setError(chatMessageFor("CHAT_GENERIC"));
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
      aria-label="Live chat"
    >
      <header
        hidden={bare}
        className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3.5"
      >
        <div className="flex items-center gap-2.5">
          <MessageSquare
            className="h-[18px] w-[18px] shrink-0 fill-primary/25 text-primary-soft"
            strokeWidth={2.25}
          />
          <h2 className="truncate font-display text-[12.5px] uppercase tracking-[0.05em]">
            Live chat
          </h2>
        </div>
        <span className="inline-flex h-4 w-32 shrink-0 items-center justify-end gap-2 text-xs text-foreground/85">
          <span className="inline-block w-[6.5rem] truncate text-right">
            {status === "offline"
              ? "Reconnecting..."
              : status === "live"
                ? "Live"
                : "Connecting..."}
          </span>
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              status === "live"
                ? "bg-success shadow-[0_0_6px_var(--success)]"
                : "bg-muted-foreground/50",
            )}
          />
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <div
            id={logId}
            ref={listRef}
            data-chat-log=""
            onScroll={onScroll}
            className="no-scrollbar absolute inset-0 overflow-y-auto [overflow-anchor:none]"
          >
            <div ref={contentRef}>
              {/* Reserved top strip: constant height so "Start of chat" / "Loading..."
                    never appear late and push the messages down. */}
              <div
                className="flex h-8 shrink-0 items-center justify-center text-[10px] uppercase tracking-widest text-muted-foreground/75"
                aria-hidden={!loadingOlder}
              >
                {loadingOlder
                  ? "Loading..."
                  : !hasMore && historyLoaded && messages.length > 0
                    ? "Start of chat"
                    : ""}
              </div>
              {messages.length === 0 && !historyLoaded && (
                <ul aria-busy="true" className="pb-1">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="flex animate-pulse items-start gap-2.5 px-3.5 py-1.5">
                      <span className="shrink-0" style={{ paddingTop: CHAT_HEADROOM }}>
                        <span
                          className="block rounded-[8%] bg-muted"
                          style={{ width: CHAT_AVATAR, height: CHAT_AVATAR }}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block h-3 w-24 rounded bg-muted" />
                        <span
                          className="mt-1 block h-4 rounded bg-muted"
                          style={{ width: `${45 + ((i * 17) % 40)}%` }}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {messages.length === 0 && historyLoaded && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No messages yet. Say hi!
                </p>
              )}
              <ul className="pb-1">
                {shown.map((m, index) => {
                  const prev = shown[index - 1];
                  const newDay = !prev || chatDayKey(prev.created_at) !== chatDayKey(m.created_at);
                  return (
                    <Fragment key={m.id}>
                      {newDay ? (
                        <li className="flex items-center gap-2 px-3.5 pt-2 pb-1">
                          <span className="h-px flex-1 bg-border" />
                          <span
                            suppressHydrationWarning
                            className="text-[10px] tracking-widest text-muted-foreground uppercase"
                          >
                            {chatDayLabel(m.created_at)}
                          </span>
                          <span className="h-px flex-1 bg-border" />
                        </li>
                      ) : null}
                      <ChatMessageRow
                        m={m}
                        mine={m.user_id === userId}
                        identity={identities.get(m.user_id)}
                        continued={!newDay && continuesPlayerTurn(prev, m)}
                      />
                    </Fragment>
                  );
                })}
              </ul>
            </div>
          </div>
          {unseen && (
            <button
              type="button"
              onClick={jump}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow"
            >
              New messages
            </button>
          )}
        </div>
        <div className="shrink-0 border-t border-border px-2.5 pt-1.5 pb-2.5">
          <p
            role={error ? "alert" : undefined}
            className="mb-1 h-4 truncate px-1 text-[11px] leading-4 text-destructive"
          >
            {userId ? (error ?? "") : ""}
          </p>
          {signedOut ? (
            <p className="flex h-10 items-center justify-center text-xs text-muted-foreground">
              <Link to="/auth" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>{" "}
              to send a message
            </p>
          ) : (
            <form onSubmit={submit} className="flex h-10 items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={CHAT_CONFIG.maxLength}
                placeholder={profile ? "Say something..." : "Finish your profile to chat"}
                disabled={!profile}
                aria-label="Chat message"
                className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={sending || !text.trim() || !profile}
                aria-label="Send"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_14px_rgb(139_53_236/45%)] disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var el=document.getElementById(${JSON.stringify(logId)});if(!el)return;void el.offsetHeight;el.scrollTop=el.scrollHeight;})();`,
        }}
      />
    </section>
  );
}
