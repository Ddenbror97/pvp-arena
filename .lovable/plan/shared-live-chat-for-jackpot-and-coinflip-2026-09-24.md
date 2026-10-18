# Shared live chat for Jackpot and Coinflip

One reusable `<GameChat gameType="jackpot" | "coinflip" />` backed by a single table, a single sending path, a single moderation module, and one realtime hook. Chat is fully independent: no changes to games, fairness, ledger, balances, workers, wallet or MetaMask.

## Where it appears
- **Jackpot (`/`):** a compact chat panel under "Your balance" in the right column, filling the height beside the wheel.
- **Coinflip (`/coinflip`):** a third slim column (~300px) on the right edge, next to Open games.
- **Mobile:** a collapsible "Live chat" panel below the game, with a sticky input bar. Long words and usernames wrap or truncate, and nothing scrolls sideways.
- **Signed out:** the panel shows "Sign in to join the chat." and loads no messages. The rooms are private, sign-in only.
- The chat is lazy-loaded after the game renders, so it never delays the first paint.

## User experience
- Header: "LIVE CHAT", a live dot, and "N online" (online count only).
- Each row shows a small avatar or initial, the username, the message text and the time, from the server clock.
- Auto-scroll happens only when you're near the bottom. Otherwise a "New messages" pill appears.
- Shows the latest 50 messages. Scrolling up loads older messages in pages of 50, based on each message's time and ID. The browser keeps at most 300 messages at a time.
- Nothing appears until the server has accepted the message. There's no instant local preview.
- Portuguese feedback:
  - Rate limit: "Você está enviando mensagens muito rápido. Aguarde alguns segundos."
  - Blocked: "Essa mensagem não pode ser enviada."
  - Muted: "Você está temporariamente impedido de enviar mensagens."
  - Too long or empty: a clear inline message.
- Links are never clickable. Everything is shown as plain text.

## Database (one migration, additive)
- `game_chat_messages`: id, game_type (jackpot|coinflip), user_id, message (1–500 chars), status (visible|hidden|deleted), moderation_reason, moderation_score, moderation_categories, moderation_provider (default 'rules'), created_at, edited_at, deleted_at, moderated_at, moderated_by.
  - Indexes: (game_type, created_at desc, id desc) where visible; (user_id, created_at desc); (status, created_at desc).
- `game_chat_user_restrictions`: user_id, muted_until, banned, reason, updated_by, timestamps.
- `game_chat_moderation_events`: id, message_id, user_id, action (BLOCKED|HIDDEN|RESTORED|MUTED|UNMUTED|BANNED|RATE_LIMITED|SPAM_DETECTED), reason_code, moderator_id, created_at. No IP addresses, emails or wallet data.
- Access rules:
  - Signed-in users can read visible messages only. Author identity is shown via a safe profile join (username and avatar).
  - Nobody can insert, update or delete from the browser. The restriction and moderation-event tables can't be read from the browser at all.
- Database functions (service-role only, fixed search_path, fully qualified names):
  - `chat_send(user, game_type, message, verdict…)` takes a per-user lock, then:
    - re-checks length, room, mute and ban;
    - enforces 5 messages per 10s, 20 per minute and 100 per hour;
    - blocks the same text repeated within 30s;
    - inserts the message with the status the server decided;
    - logs a moderation event;
    - returns a typed result code.
  - Moderator-ready helpers, with no screen for them yet: `chat_set_status` (hide, restore, delete) and `chat_set_restriction` (mute, ban). Both log an audit event.
- Realtime:
  - A trigger on insert or status change calls `realtime.send` on the private topics `chat:jackpot` / `chat:coinflip`.
  - A `message` event carries only: id, game_type, user_id, display_name, avatar initials/URL, message, created_at.
  - A `removed` event carries only the id when a message stops being visible.
  - Hidden or blocked messages are never broadcast.
- Realtime authorization: sign-in-only policies on realtime messages allow receiving on `chat:*` topics and presence on those topics. Broadcast sending from browsers is not allowed, so only the database can post messages.

## Sending path (server-authoritative)
```text
Browser { game_type, message }
  -> sendChatMessage server function (requires sign-in; identity from session)
  -> validate (zod, max ~2KB request) -> normalise -> moderation verdict
  -> chat_send() in the database: rate limits, duplicates, mute, insert
  -> trigger broadcasts to chat:<game>
  -> all connected clients (dedupe by id)
```
The browser never sends user_id, username, status or moderation fields. Any extra fields are rejected.

## Moderation module (pure, testable)
- **Normalisation:** NFKC, strip control and zero-width characters, collapse whitespace. Emoji and accents are kept.
- **Layered rules**, applied to a "skeleton" copy of the text (lowercased, leetspeak mapped, spacing and repeated letters collapsed):
  - English and Portuguese slurs, threats, sexual content and illegal activity;
  - scam and phishing phrases (seed phrase, private key, "send me ETH", airdrop claim, and similar);
  - links: http(s), www, common TLDs, t.me, discord.gg, IP URLs;
  - spam: repeated characters, emoji floods, all-caps floods.
- **Result:** LOW visible, MEDIUM hidden (stored, not broadcast, flagged for review; links go here), HIGH blocked (stored as hidden and audited, and the user sees "Essa mensagem não pode ser enviada.").
- **Tuning:** thresholds and word lists are central constants.
- **Future-ready:** a `ModerationProvider` interface makes it possible to plug in an AI moderator later. Only the rules provider ships now.
- **False-positive guard:** everyday gaming chat must pass (gg, ez, rip, nice, "vamos", "boa sorte", "que sorte", "kill streak").

## Realtime client (one hook: `useGameChat`)
- Subscribes in an effect to the private channel `chat:<game>` with the user's token. It refreshes the token on auth changes and cleans up on unmount and sign-out.
- Handles `message` and `removed` events, dedupes by id, and orders by (created_at, id).
- On subscribe or reconnect, and when the tab becomes visible again, it re-fetches the latest page and merges it in, because the database is the source of truth.
- The client library handles reconnects with backoff. Presence tracks only a random session key per tab and is throttled.
- No typing indicators.

## Tests
- **Unit:**
  - length and empty checks, normalisation, the skeleton rules, obfuscated profanity;
  - scam and link detection, spam heuristics, classification thresholds;
  - no false positives on the gaming phrase set;
  - room validation, request validation (extra fields, oversized, malformed);
  - XSS strings stay inert text, checked with React render-to-string.
- **Database** (isolated test schema):
  - visible/hidden read rules;
  - rate limits, including 25 simultaneous sends giving exactly 5 successes;
  - duplicate blocking, mute and ban enforcement;
  - moderation state changes;
  - rooms stay isolated;
  - audit rows, and SQL-injection strings stored literally.
- **Access rules** (anonymous and signed-in browser client):
  - can't insert, update or delete, and can't call internal functions;
  - can't read restrictions or events;
  - can't forge user or status fields.
- **Realtime:** two real signed-in clients (test users only exist in the isolated schema, so this uses mocked events plus a Playwright check with your session).
  - A message arrives once.
  - The other room receives nothing.
  - A duplicate event is ignored.
  - A removed event deletes the row.
  - Reconnecting reconciles with history.
  - Signing out unsubscribes.
- **Regression:** the full existing suite, type check, lint of the new files, and the build.

## Out of scope
- No admin screen: functions only.
- No AI moderation provider enabled.
- No typing indicators and no DMs.
- No changes to any game or money logic.

## Technical details
- New files:
  - `src/lib/chat/config.ts` (limits, thresholds, rooms)
  - `src/lib/chat/moderation.ts` (normalise, skeleton, rules, `classify`, provider interface)
  - `src/lib/chat/chat.functions.ts` (`sendChatMessage`, requireSupabaseAuth, zod `.strict()`)
  - `src/lib/chat/chat.server.ts` (admin RPC call, result mapping)
  - `src/lib/chat/api.ts` (history fetch with cursor, `useGameChat` hook)
  - `src/lib/chat/errors.ts` (Portuguese messages)
  - `src/components/chat/GameChat.tsx`, `ChatMessageRow.tsx`
- Edited: `JackpotStage.tsx` (chat below EntryPanel), `coinflip.tsx` (grid `lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]`).
- History uses the browser client and RLS: `select id, game_type, user_id, message, created_at, profiles(username, avatar_url)`, filtered by `game_type`, `status='visible'`, older than the cursor `(created_at, id)`, limit 50.
- The broadcast uses `realtime.send(payload, event, topic, private => true)` from an AFTER INSERT/UPDATE trigger. Topic and event names come from constants.
- Rate limits are counted from `game_chat_messages` plus RATE_LIMITED events inside `chat_send`, under `pg_advisory_xact_lock(hashtext('chat:'||user))`, so parallel sends can't slip past the limit.
- Tests: `tests/chat-moderation.test.ts`, `tests/chat-client.test.ts`, `tests/db/chat.integration.test.ts`, and additions to `tests/db/rls.integration.test.ts`.
- Limitation to note: the Realtime connection limits are the platform's. The app adds per-user send limits, and the client throttles reconnects.
