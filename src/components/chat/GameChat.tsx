import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGameChat, type ChatMessage } from "@/lib/chat/api";
import { sendChatMessage } from "@/lib/chat/chat.functions";
import { CHAT_CONFIG, type ChatRoom } from "@/lib/chat/config";
import { chatMessageFor } from "@/lib/chat/errors";
import { ChatMessageRow } from "./ChatMessageRow";
import { cn } from "@/lib/utils";

export { ChatMessageRow };

export function GameChat({ gameType, className }: { gameType: ChatRoom; className?: string }) {
  const { userId, profile } = useAuth();
  const { messages, historyLoaded, online, status, hasMore, loadingOlder, loadOlder } = useGameChat(
    gameType,
    userId && profile ? userId : null,
  );
  const send = useServerFn(sendChatMessage);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const prevLast = useRef<string | undefined>(undefined);
  const prevFirst = useRef<string | undefined>(undefined);
  const prevHeight = useRef(0);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const first = messages[0]?.id;
    const last = messages[messages.length - 1]?.id;
    if (first !== prevFirst.current && last === prevLast.current && prevHeight.current) {
      // Older page prepended: keep the reader's position.
      el.scrollTop += el.scrollHeight - prevHeight.current;
    } else if (last !== prevLast.current) {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
      else if (prevLast.current) setUnseen(true);
    }
    prevFirst.current = first;
    prevLast.current = last;
    prevHeight.current = el.scrollHeight;
  }, [messages]);

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
    if (el.scrollTop < 40 && hasMore && !loadingOlder) void loadOlder();
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
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          <MessageSquare className="h-3.5 w-3.5 text-primary" />
          <h2 className="font-display text-xs uppercase tracking-widest">Live chat</h2>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition lg:hidden",
              collapsed && "-rotate-90",
            )}
          />
        </button>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              status === "live" ? "animate-pulse bg-p4" : "bg-muted-foreground/50",
            )}
          />
          {status === "live" ? (
            <span className="tabular">{online} online</span>
          ) : userId ? (
            status === "offline" ? (
              "Reconnecting..."
            ) : (
              "Connecting..."
            )
          ) : (
            "Live"
          )}
        </span>
      </header>

      <div className={cn("flex min-h-0 flex-1 flex-col", collapsed && "hidden lg:flex")}>
        {!userId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">Sign in to join the chat.</p>
            <Link to="/auth" className="text-xs font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="relative min-h-0 flex-1">
              <div
                ref={listRef}
                onScroll={onScroll}
                className="absolute inset-0 overflow-y-auto overscroll-contain"
              >
                {loadingOlder && (
                  <p className="py-2 text-center text-[11px] text-muted-foreground">Loading...</p>
                )}
                {!hasMore && messages.length > 0 && (
                  <p className="py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    Start of chat
                  </p>
                )}
                {messages.length === 0 && !historyLoaded && userId && (
                  <ul aria-busy="true" className="space-y-3 px-3 py-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <li key={i} className="flex animate-pulse items-start gap-2">
                        <span className="h-6 w-6 shrink-0 rounded-full bg-muted" />
                        <span className="h-4 rounded bg-muted" style={{ width: `${45 + ((i * 17) % 40)}%` }} />
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
                  {messages.map((m) => (
                    <ChatMessageRow key={m.id} m={m} mine={m.user_id === userId} />
                  ))}
                </ul>
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
            <form onSubmit={submit} className="border-t border-border p-2">
              {error && (
                <p role="alert" className="mb-1.5 px-1 text-[11px] text-destructive">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={CHAT_CONFIG.maxLength}
                  placeholder={profile ? "Say something..." : "Finish your profile to chat"}
                  disabled={!profile}
                  aria-label="Chat message"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim() || !profile}
                  aria-label="Send"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
