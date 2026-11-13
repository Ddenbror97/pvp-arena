import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CalendarDays,
  Crosshair,
  Crown,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { fetchDuelAvatars, fetchDuelLobby, fetchDuelRankings, duelError } from "@/lib/fps/api";
import { duelAction } from "@/lib/fps/duel.functions";
import { duelMoney, duelQuote, type DuelLobbyData } from "@/lib/fps/quote";
import { STRIKE_SHOWCASE } from "@/lib/fps/showcase";
import { warmArenaAssets, warmArenaRenderer } from "@/lib/fps/renderer-loader";
import { useFpsQueue } from "@/lib/fps/queue";
import { reserveArenaPointer, releaseArenaPointer } from "@/lib/fps/entry-capture";
import { walletQuery } from "@/lib/jackpot/api";
import { useLobbyFeed } from "@/lib/fps/lobby-feed";
import { openGames, sameRoomTerms, lobbyPollMs, LOBBY_FRESH_MS } from "@/lib/fps/open-games";
import { warmBombLoadingImage } from "@/lib/fps/bomb/loading";
import { warmBrLoadingImage } from "@/lib/fps/br/loading";
import { OpenGames } from "./OpenGames";
import { GpuGuideLink } from "./GpuGuideLink";
import { StrikeModePicker, type StrikeMode } from "./StrikeModePicker";
import { useBrAccess } from "@/lib/fps/br/use-access";
import "./strike-lobby.css";
import "./strike-mode-lobby.css";

type OpenRoom = DuelLobbyData["open"][number];
const FACTS = [
  { icon: Users, title: "1v1 duels" },
  { icon: Crosshair, title: "Tactical combat" },
  { icon: Trophy, title: "95% winner payout" },
  { icon: ShieldCheck, title: "Server-validated hits" },
];

function Quote({ stake }: { stake: number }) {
  const quote = duelQuote(stake);
  return (
    <dl className="strike-quote">
      <div>
        <dt>Entry per player</dt>
        <dd>{stake === 0 ? "Free practice" : duelMoney(stake)}</dd>
      </div>
      <div>
        <dt>Prize pool</dt>
        <dd>{duelMoney(quote.pot)}</dd>
      </div>
      <div>
        <dt>Platform fee · 5%</dt>
        <dd>{duelMoney(quote.fee)}</dd>
      </div>
      <div>
        <dt>Winner receives</dt>
        <dd>{duelMoney(quote.payout)}</dd>
      </div>
    </dl>
  );
}

/** One-glance terms for the create form (the join dialog keeps the full table). */
function QuoteLine({ stake }: { stake: number }) {
  const quote = duelQuote(stake);
  return (
    <dl className="strike-quote-line">
      <div>
        <dt>Prize pool</dt>
        <dd>{duelMoney(quote.pot)}</dd>
      </div>
      <div>
        <dt>Winner receives</dt>
        <dd>{duelMoney(quote.payout)}</dd>
      </div>
    </dl>
  );
}

export function DuelLobby() {
  // `ready`: the session is known. Until then the signed-in controls show (disabled), not a
  // "Sign in" link that swaps for them a moment later.
  const { userId, profile, ready } = useAuth(),
    navigate = useNavigate(),
    qc = useQueryClient();
  const action = useServerFn(duelAction);
  const brAccess = useBrAccess();
  const pollOffset = useRef(Math.floor(Math.random() * 1000));
  const pushed = useLobbyFeed(qc);
  const lobby = useQuery({
    queryKey: ["fps-lobby", userId],
    queryFn: fetchDuelLobby,
    staleTime: 5000,
    refetchInterval: (query) =>
      lobbyPollMs(!!query.state.data?.open.length, query.state.status === "error", pushed) +
      pollOffset.current,
    refetchIntervalInBackground: false,
    retry: 1,
  });
  const wallet = useQuery({ ...walletQuery(userId), enabled: !!userId, retry: 1 });
  const rankings = useQuery({
    queryKey: ["fps-rankings"],
    queryFn: fetchDuelRankings,
    staleTime: 60000,
    retry: false,
  });
  const [panel, setPanel] = useState<"games" | "create">("games");
  const [mode, setMode] = useState<StrikeMode>("duel");
  const [stake, setStake] = useState(100);
  const format = 13;
  const [accepted, setAccepted] = useState(false);
  const [selected, setSelected] = useState<OpenRoom | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [operation, setOperation] = useState<"join" | "create" | "practice" | "cancel" | null>(
    null,
  );
  const [desktop, setDesktop] = useState<boolean | null>(null),
    [now, setNow] = useState(Date.now);
  const keys = useRef(new Map<string, string>());
  const actionInFlight = useRef(false);
  const data = lobby.data;
  const queue = useFpsQueue();
  const waiting = queue.data?.cash?.status === "WAITING" ? queue.data.cash : null;
  const [alertPermission, setAlertPermission] = useState<
    NotificationPermission | "unsupported" | null
  >(null);
  useEffect(() => {
    setAlertPermission("Notification" in window ? Notification.permission : "unsupported");
    // Any fine pointer: a touch-screen laptop with a mouse reports a coarse *primary* pointer.
    const media = matchMedia("(any-pointer:fine) and (any-hover:hover)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setNow(Date.now());
    }, 1000);
    return () => {
      media.removeEventListener("change", update);
      window.clearInterval(timer);
    };
  }, []);
  const allowed = (amount: number) =>
    !!data?.enabled &&
    (amount === 0 ? data.practice_allowed : data.cash_enabled && data.stakes.includes(amount));
  const rooms = openGames(data, now);
  const fresh = !!data && !lobby.isError && now - lobby.dataUpdatedAt < LOBBY_FRESH_MS;
  const currentSelection = selected ? rooms.find((room) => room.id === selected.id) : undefined;
  const retryingJoin = !!selected && keys.current.has(`join:${selected.id}`);
  const selectionProblem = retryingJoin
    ? null
    : !fresh
      ? lobby.isFetching
        ? "Refreshing the room list…"
        : "Reconnect to refresh this room before joining."
      : !currentSelection
        ? "This room is no longer listed. Refresh games and choose another room."
        : selected && !sameRoomTerms(selected, currentSelection)
          ? "This room’s terms changed. Close this view and review it again."
          : null;
  const insufficient =
    !retryingJoin &&
    !!selected &&
    wallet.data !== undefined &&
    wallet.data.available < selected.stake;
  const mine = data?.mine ?? null;
  // Joining ends a bot practice or cancels (and refunds) the player's own open room first; only
  // a cash match already under way blocks it.
  const leaving: "practice" | "room" | null = mine?.practice
    ? "practice"
    : mine && mine.status === "WAITING" && mine.creator_id === userId
      ? "room"
      : null;
  const blockedReason =
    mine && !leaving ? "Finish your current match before joining another." : null;
  const featured = rooms.find((room) => room.creator_id !== userId);
  const creatorIds = [...new Set(rooms.map((room) => room.creator_id))].sort();
  const avatars = useQuery({
    queryKey: ["fps-lobby-avatars", creatorIds],
    queryFn: () => fetchDuelAvatars(creatorIds),
    enabled: creatorIds.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  }).data;
  /** Open the join view for a room, refreshing the list if it is stale. */
  const review = (room: OpenRoom) => {
    setSelected(room);
    setError(null);
    setOperation("join");
    if (!fresh) void lobby.refetch();
  };
  const selectedStake = panel === "games" ? (featured?.stake ?? stake) : stake;
  const change = () => {
    setAccepted(false);
    setError(null);
  };

  async function run(room?: OpenRoom) {
    if (!userId) {
      await navigate({ to: "/auth" });
      return;
    }
    const retry = !!room && keys.current.has(`join:${room.id}`);
    setOperation(room ? "join" : "create");
    if (
      actionInFlight.current ||
      !desktop ||
      (!retry && (!allowed(room?.stake ?? stake) || (room ? !!blockedReason : !!data?.mine))) ||
      (!room && !accepted)
    )
      return;
    if (!retry && !fresh) {
      setError("Reconnect to the lobby before entering a game.");
      return;
    }
    if (room && !retry) {
      const current = rooms.find((r) => r.id === room.id && Date.parse(r.expires_at) > Date.now());
      if (!current || !sameRoomTerms(room, current)) {
        setError(duelError(new Error(current ? "TERMS_CHANGED" : "MATCH_NOT_OPEN")));
        return;
      }
    }
    actionInFlight.current = true;
    const token = room ? `join:${room.id}` : `create:${stake}:${format}:false`;
    warmArenaAssets();
    if (room) reserveArenaPointer(room.id);
    setBusy(true);
    setError(null);
    try {
      // Only new entries preflight the balance. An interrupted request retains
      // its key because its entry may already have been reserved by the ledger.
      if (!keys.current.has(token)) {
        const funds = await qc.fetchQuery({ ...walletQuery(userId), staleTime: 0 }).catch(() => {
          throw new Error("BALANCE_CHECK_FAILED");
        });
        if (funds.available < (room?.stake ?? stake)) throw new Error("INSUFFICIENT_BALANCE");
      }
      // End a running bot practice, or cancel (refund) the player's own open room, so the
      // join is not refused as "already in a match".
      if (room && !retry && mine && leaving)
        await action({ data: { action: "cancel", matchId: mine.id } });
      const key = keys.current.get(token) ?? crypto.randomUUID();
      keys.current.set(token, key);
      const result = (await action({
        data: room
          ? { action: "join", combatVersion: 2, matchId: room.id, key }
          : { action: "create", combatVersion: 2, stake, bestOf: format, private: false, key },
      })) as DuelLobbyData["mine"] & { match_id?: string };
      if (!result) throw Error("DUEL_REQUEST_FAILED");
      const id = result.match_id ?? result.id;
      if (!id) throw Error("DUEL_REQUEST_FAILED");
      if (result.id && result.status && result.creator_id)
        qc.setQueryData(["fps-view", id, userId], result);
      if (room) setSelected(null);
      if (room || result.status !== "WAITING")
        await navigate({ to: "/fps/$matchId", params: { matchId: id } });
      else setPanel("games");
      keys.current.delete(token);
    } catch (e) {
      releaseArenaPointer();
      if (
        e instanceof Error &&
        [
          "MATCH_NOT_OPEN",
          "CREATOR_AWAY",
          "TERMS_CHANGED",
          "INSUFFICIENT_BALANCE",
          "MATCH_EXPIRED",
          "ALREADY_IN_MATCH",
        ].includes(e.message)
      )
        keys.current.delete(token);
      setError(duelError(e));
    } finally {
      actionInFlight.current = false;
      setBusy(false);
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void qc.invalidateQueries({ queryKey: ["fps-lobby"] });
      void qc.invalidateQueries({ queryKey: ["fps-queue"] });
    }
  }

  async function practice() {
    if (!userId) {
      await navigate({ to: "/auth" });
      return;
    }
    if (
      actionInFlight.current ||
      !desktop ||
      !data?.enabled ||
      !data.practice_allowed ||
      (data.mine && !data.mine.practice && data.mine.status !== "WAITING")
    )
      return;
    actionInFlight.current = true;
    const key = keys.current.get("practice") ?? crypto.randomUUID();
    setOperation("practice");
    keys.current.set("practice", key);
    setBusy(true);
    setError(null);
    warmArenaAssets();
    reserveArenaPointer();
    try {
      const result = (await action({
        data: { action: "practice", combatVersion: 2, key },
      })) as NonNullable<DuelLobbyData["mine"]>;
      qc.setQueryData(["fps-view", result.id, userId], result);
      await navigate({ to: "/fps/$matchId", params: { matchId: result.id } });
      keys.current.delete("practice");
    } catch (e) {
      releaseArenaPointer();
      setError(duelError(e));
    } finally {
      actionInFlight.current = false;
      setBusy(false);
      void qc.invalidateQueries({ queryKey: ["fps-lobby"] });
      void qc.invalidateQueries({ queryKey: ["fps-queue"] });
    }
  }
  return (
    <div className="strike-lobby strike-mode-lobby">
      <section className="strike-stage" aria-labelledby="strike-title">
        <div className="strike-stage-room" aria-hidden>
          <img
            src={STRIKE_SHOWCASE}
            alt=""
            width={1672}
            height={941}
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <div className="strike-stage-shade" aria-hidden />
        <div className="strike-stage-body">
          <div className="strike-intro">
            <h1 id="strike-title">
              <Crosshair aria-hidden />
              <span>
                PvP<span>Strike</span>
              </span>
            </h1>
            <p className="strike-tagline">One arena. One winner.</p>
            <ul className="strike-facts">
              {FACTS.map(({ icon: Icon, title }) => (
                <li key={title}>
                  <Icon aria-hidden />
                  <div>
                    <strong>{title}</strong>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="strike-showcase">
            <div className="strike-matchup" aria-label="Preview matchup">
              <div>
                <PlayerAvatar
                  name={featured?.username ?? profile?.username ?? "Your seat"}
                  src={featured ? avatars?.[featured.creator_id] : profile?.avatar_url}
                  color="#c084fc"
                  className="strike-seat-avatar rounded-full"
                  priority
                />
                <span>
                  <strong>{featured?.username ?? profile?.username ?? "Your seat"}</strong>
                  <small>
                    {selectedStake === 0 ? "Practice" : duelMoney(selectedStake) + " entry"}
                  </small>
                </span>
              </div>
              <b>VS</b>
              <div className="strike-open-seat">
                <span>
                  <strong>Open seat</strong>
                  {featured && (
                    <button
                      type="button"
                      className="strike-seat-join"
                      disabled={busy || !!blockedReason}
                      onClick={() => review(featured)}
                    >
                      Join for {duelMoney(featured.stake)}
                    </button>
                  )}
                </span>
                <span className="strike-seat-avatar">
                  <Users aria-hidden />
                </span>
              </div>
            </div>
            <StrikeModePicker
              mode={mode}
              desktop={desktop}
              battleAllowed={brAccess.data === true}
              onSelect={setMode}
              onPlay={() => {
                if (featured && !blockedReason) {
                  setPanel("games");
                  review(featured);
                  return;
                }
                setPanel(featured ? "games" : "create");
                document
                  .getElementById("strike-play-panel")
                  ?.scrollIntoView({ block: "nearest", behavior: "auto" });
                document
                  .getElementById(featured ? "strike-tab-games" : "strike-tab-create")
                  ?.focus({ preventScroll: true });
              }}
            />
          </div>

          <aside
            id="strike-play-panel"
            className={`strike-games${waiting ? " strike-queue-active" : ""}`}
            aria-label="PvPStrike lobby"
            onMouseEnter={() => {
              if (userId && desktop) warmArenaRenderer();
            }}
            onFocus={() => {
              if (userId && desktop) warmArenaRenderer();
            }}
          >
            <div className="strike-tabs" role="tablist" aria-label="PvPStrike games">
              {(["games", "create"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  disabled={desktop === null || busy}
                  id={`strike-tab-${value}`}
                  aria-controls={`strike-panel-${value}`}
                  aria-selected={panel === value}
                  onClick={() => {
                    setPanel(value);
                    if (value === "create" && userId && desktop) warmArenaAssets();
                    setError(null);
                  }}
                >
                  {value === "games" ? (
                    <>
                      Join a game
                      {rooms.length > 0 && <span className="strike-tab-count">{rooms.length}</span>}
                    </>
                  ) : (
                    "Create game"
                  )}
                </button>
              ))}
            </div>
            {waiting && (
              <div className="strike-notice" role="status">
                <strong>Your human-only cash room is open.</strong>
                <p>
                  Browse the site or play free bot Practice. We’ll show “Join now” when an opponent
                  joins. Keep this site open: after two minutes offline, the room closes and your
                  entry is refunded. Ready up within 60 seconds of a join.
                </p>
                <Link to="/fps/$matchId" params={{ matchId: waiting.id }}>
                  Room details
                </Link>
                <button
                  className="strike-join"
                  disabled={busy}
                  onClick={() => {
                    if (actionInFlight.current) return;
                    actionInFlight.current = true;
                    setOperation("cancel");
                    setBusy(true);
                    setError(null);
                    void action({ data: { action: "cancel", matchId: waiting.id } })
                      .then(() => {
                        void qc.invalidateQueries({ queryKey: ["fps-queue"] });
                        void qc.invalidateQueries({ queryKey: ["fps-lobby"] });
                        void qc.invalidateQueries({ queryKey: ["wallet"] });
                      })
                      .catch((e) => setError(duelError(e)))
                      .finally(() => {
                        actionInFlight.current = false;
                        setBusy(false);
                      });
                  }}
                >
                  Cancel & refund
                </button>
                {error && operation === "cancel" && (
                  <p className="strike-error" role="alert">
                    {error}
                  </p>
                )}
                {alertPermission === "default" && (
                  <button
                    className="strike-join"
                    onClick={() => {
                      if ("Notification" in window)
                        void Notification.requestPermission()
                          .then(setAlertPermission)
                          .catch(() => setAlertPermission("denied"));
                    }}
                  >
                    Enable desktop alerts
                  </button>
                )}
              </div>
            )}
            {data?.mine && !waiting && (
              <Link className="strike-resume" to="/fps/$matchId" params={{ matchId: data.mine.id }}>
                Return to your {data.mine.status === "WAITING" ? "room" : "match"}
                <ArrowRight size={16} />
              </Link>
            )}
            {desktop === false && (
              <p className="strike-notice" role="status">
                Play on desktop with a mouse and keyboard. You can browse rooms here.
              </p>
            )}
            {panel === "create" && lobby.isError && (
              <p className="strike-error" role="status">
                The lobby is unavailable. Refresh to reconnect.
              </p>
            )}
            {!lobby.isPending && data && !data.enabled && (
              <p className="strike-notice" role="status">
                Matchmaking is temporarily paused.
              </p>
            )}
            <div
              className="strike-panel"
              id={`strike-panel-${panel}`}
              role="tabpanel"
              aria-labelledby={`strike-tab-${panel}`}
            >
              {panel === "games" ? (
                <OpenGames
                  rooms={rooms}
                  avatars={avatars}
                  stakes={data?.stakes ?? []}
                  userId={userId}
                  available={wallet.data?.available}
                  loading={lobby.isPending}
                  refreshing={lobby.isFetching}
                  failed={lobby.isError}
                  fresh={fresh}
                  enabled={!!data?.enabled && !!data.cash_enabled}
                  busy={busy}
                  blockedReason={blockedReason}
                  onRefresh={() => void lobby.refetch()}
                  onCreate={() => {
                    setPanel("create");
                    change();
                  }}
                  onOpen={(room) =>
                    void navigate({ to: "/fps/$matchId", params: { matchId: room.id } })
                  }
                  onReview={review}
                />
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run();
                  }}
                >
                  <fieldset className="strike-fieldset">
                    <legend>
                      Entry per player <span>USD</span>
                    </legend>
                    <div className="strike-stakes">
                      {[...(data?.cash_enabled ? data.stakes : [])].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          aria-pressed={stake === amount}
                          onClick={() => {
                            setStake(amount);
                            change();
                          }}
                        >
                          {amount === 0 ? "Practice" : duelMoney(amount)}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  {(lobby.isPending || !data?.cash_enabled) && (
                    <p className="strike-fineprint strike-entry-status">
                      {lobby.isPending
                        ? "Loading available entries…"
                        : "Cash entries are currently closed. Practice is free and does not affect your balance or rating."}
                    </p>
                  )}
                  <QuoteLine stake={stake} />
                  <p className="strike-create-terms">
                    Platform fee 5% · Best of 13, first to seven · sides switch after round six
                  </p>
                  <label className="strike-check strike-consent">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    I accept this entry, format and the match rules.
                  </label>
                  {mine && (
                    <p className="strike-room-warning" role="status">
                      {mine.practice
                        ? "Finish or leave your practice match before creating a cash game."
                        : mine.status === "WAITING"
                          ? "You already have an open room."
                          : "Finish your current match before creating another."}
                    </p>
                  )}
                  {error && operation === "create" && (
                    <p className="strike-error" role="alert">
                      {error}
                    </p>
                  )}
                  {userId || !ready ? (
                    <button
                      type="submit"
                      onPointerEnter={() => {
                        if (userId && desktop) warmArenaAssets();
                      }}
                      onFocus={() => {
                        if (userId && desktop) warmArenaAssets();
                      }}
                      className="strike-primary"
                      aria-label="Create game"
                      disabled={
                        !userId ||
                        busy ||
                        !accepted ||
                        desktop !== true ||
                        !allowed(stake) ||
                        !!data?.mine
                      }
                    >
                      {busy ? "Creating…" : `Create game · ${duelMoney(stake)}`}
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <Link to="/auth" className="strike-primary">
                      Sign in to play <ArrowRight size={16} />
                    </Link>
                  )}
                  <details className="strike-create-rules">
                    <summary>How rooms work</summary>
                    <p>
                      Human opponents only. Browse or play free Practice while waiting. Keep the
                      site open: two minutes offline closes the room for a full refund. Rooms expire
                      after 24 hours. Both players have 60 seconds to ready up after a join.
                    </p>
                  </details>
                </form>
              )}
            </div>
            <div className="strike-practice-strip" aria-label="Free practice">
              <h2>Free practice</h2>
              <div className="strike-practice-row">
                <div className="strike-practice">
                  <Crosshair className="strike-practice-icon" aria-hidden />
                  <h3>Solo</h3>
                  <button
                    type="button"
                    className="strike-secondary"
                    disabled={
                      busy ||
                      desktop !== true ||
                      !data?.enabled ||
                      !data.practice_allowed ||
                      (!!data.mine && !data.mine.practice && data.mine.status !== "WAITING")
                    }
                    onPointerEnter={() => {
                      if (userId && desktop) warmArenaAssets();
                    }}
                    onClick={() => void practice()}
                  >
                    {data?.practice ? "Resume Practice" : "Practice vs Bot"}{" "}
                    <ArrowRight size={16} />
                  </button>
                  {error && operation === "practice" && (
                    <p className="strike-error" role="alert">
                      {error}
                    </p>
                  )}
                </div>
                <div className="strike-practice">
                  <CalendarDays className="strike-practice-icon" aria-hidden />
                  <h3>Training</h3>
                  {desktop === true ? (
                    <Link
                      className="strike-secondary"
                      to="/fps-bomb"
                      onPointerEnter={warmBombLoadingImage}
                      onFocus={warmBombLoadingImage}
                      onClick={() => {
                        warmBombLoadingImage();
                        if (userId) reserveArenaPointer("bomb");
                      }}
                    >
                      Practice Defuse the Bomb <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <button type="button" className="strike-secondary" disabled>
                      Practice Defuse the Bomb <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                <div className="strike-practice">
                  <Crown className="strike-practice-icon" aria-hidden />
                  <h3>Battle Royale</h3>
                  {desktop === true && brAccess.data === true ? (
                    <Link
                      className="strike-secondary"
                      to="/fps-br"
                      onPointerEnter={warmBrLoadingImage}
                      onFocus={warmBrLoadingImage}
                      onClick={warmBrLoadingImage}
                    >
                      Play Now <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <button type="button" className="strike-secondary" disabled>
                      {/* (Until the session and the pointer are known: the label it will have.) */}
                      {brAccess.isPending || desktop === null
                        ? "Play Now"
                        : brAccess.data === true
                          ? "Desktop only"
                          : "Sign in to play"}
                      {(brAccess.isPending || desktop === null) && <ArrowRight size={16} />}
                    </button>
                  )}
                </div>
              </div>
              <GpuGuideLink />
            </div>
          </aside>
        </div>
      </section>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setSelected(null);
            setError(null);
          }
        }}
      >
        <DialogContent
          className="strike-join-dialog"
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <DialogTitle className="strike-join-title">
            {selected && (
              <PlayerAvatar
                name={selected.username}
                src={avatars?.[selected.creator_id]}
                color="#c084fc"
                className="strike-row-avatar rounded-full"
              />
            )}
            Join {selected?.username}?
          </DialogTitle>
          <DialogDescription>
            Review this room’s terms. Joining reserves the entry shown below.
          </DialogDescription>
          {selected && (
            <>
              <p className="strike-join-format">
                Best of {selected.best_of} · First to {(selected.best_of + 1) / 2} round wins
              </p>
              <Quote stake={selected.stake} />
              <p className="strike-fineprint">
                By choosing Join below, you accept this entry, format and 5% fee.
              </p>
              {selectionProblem && (
                <p className="strike-room-warning" role="status">
                  {selectionProblem}
                </p>
              )}
              {blockedReason && !retryingJoin && (
                <p className="strike-room-warning" role="status">
                  {blockedReason}{" "}
                  {mine && (
                    <Link to="/fps/$matchId" params={{ matchId: mine.id }}>
                      Return to your match
                    </Link>
                  )}
                </p>
              )}
              {leaving && !retryingJoin && (
                <p className="strike-fineprint strike-join-note" role="status">
                  {leaving === "practice"
                    ? "Joining ends your practice match against the bot."
                    : `Joining cancels your open ${duelMoney(mine!.stake)} room; its entry is refunded.`}
                </p>
              )}
              {!retryingJoin && !allowed(selected.stake) && data && (
                <p className="strike-room-warning" role="status">
                  This entry is not offered right now. Refresh the lobby and try again.
                </p>
              )}
              {wallet.isError && (
                <p className="strike-room-warning" role="status">
                  We could not check your balance.{" "}
                  <button type="button" onClick={() => void wallet.refetch()}>
                    Try again
                  </button>
                </p>
              )}
              {userId && (
                <p className="strike-fineprint">
                  {wallet.isFetching
                    ? "Checking balance…"
                    : wallet.data
                      ? "Available " +
                        duelMoney(wallet.data.available) +
                        " · Eligible credits included"
                      : "Your balance will be checked before entry."}
                </p>
              )}
              {insufficient && (
                <p className="strike-error" role="status">
                  You need {duelMoney(selected.stake - wallet.data!.available)} more for this entry.{" "}
                  <Link to="/wallet">Open wallet</Link>
                </p>
              )}
              {desktop === false && (
                <p className="strike-fineprint">Join from a desktop with a mouse and keyboard.</p>
              )}
              {error && operation === "join" && (
                <p className="strike-error" role="alert">
                  {error}
                </p>
              )}
              {userId ? (
                <button
                  type="button"
                  className="strike-primary"
                  disabled={
                    busy ||
                    !!selectionProblem ||
                    (!retryingJoin &&
                      (!!blockedReason ||
                        insufficient ||
                        wallet.isPending ||
                        !allowed(selected.stake))) ||
                    desktop !== true
                  }
                  onClick={() => void run(selected)}
                >
                  {busy
                    ? "Joining…"
                    : leaving === "practice" && !retryingJoin
                      ? `Leave practice & join for ${duelMoney(selected.stake)}`
                      : leaving === "room" && !retryingJoin
                        ? `Cancel my room & join for ${duelMoney(selected.stake)}`
                        : `Join for ${duelMoney(selected.stake)}`}
                  <ArrowRight size={16} />
                </button>
              ) : (
                <Link to="/auth" className="strike-primary">
                  Sign in to join
                </Link>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="strike-details">
        {!!data?.live?.length && (
          <section className="strike-live">
            <h2>Live in the arena</h2>
            <p>Public matches · Spectators are delayed by 5 seconds.</p>
            <div>
              {data.live.map((room) => (
                <Link
                  key={room.id}
                  to="/fps/$matchId"
                  params={{ matchId: room.id }}
                  search={{ spectate: true }}
                >
                  Watch {room.username}
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </section>
        )}
        <section className="strike-rules" id="strike-rules">
          <div>
            <span className="strike-kicker">KNOW YOUR MATCH</span>
            <h2>Your aim. Your result.</h2>
          </div>
          <div className="strike-rule-grid">
            <article>
              <Trophy />
              <h3>Win the rounds</h3>
              <p>
                Best of 13 is first to seven, with sides switching after round six. A round lasts 60
                seconds; higher health wins at timeout. Three drawn rounds cancel the match.
              </p>
            </article>
            <article>
              <ShieldCheck />
              <h3>Control your recoil</h3>
              <p>
                Anti-Terrorists carry a suppressed M4A1-S, Terrorists an AK-47. Both rifles are full
                auto with identical damage: tap or fire short bursts to recover faster. Head hits
                deal 34 damage, chest 34, stomach 30 and legs 20. Three landed headshots eliminate
                at full health. The server controls ammunition, hits and results.
              </p>
            </article>
            <article>
              <Users />
              <h3>Room to reconnect</h3>
              <p>
                Ready up within 60 seconds. A disconnect allows 30 seconds to reconnect. Both absent
                or an interrupted server cancels for a refund.
              </p>
            </article>
          </div>
        </section>
        <section className="strike-rankings">
          <h2>Competitive ladder</h2>
          {rankings.isPending ? (
            // Placeholder rows while the ladder loads (no text that a list then replaces).
            <ol
              className="strike-rankings-loading"
              aria-busy="true"
              aria-label="Loading the ladder"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <li key={n} aria-hidden />
              ))}
            </ol>
          ) : rankings.data?.length ? (
            <ol>
              {rankings.data.map((row, index) => (
                <li key={row.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{row.username}</strong>
                  <b>{row.rating} Elo</b>
                  <small>
                    {row.wins} wins / {row.played} matches
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p>
              {rankings.isError
                ? "Rankings are temporarily unavailable."
                : "Only verified public cash results count toward your rank."}
            </p>
          )}
        </section>
        <p className="strike-fineprint">
          <a href="/fps-1v1">PvPStrike rules, fees and public results</a> ·{" "}
          <a href="/guides/topics/fps-and-aim">FPS and aim guides</a>
        </p>
        <p className="strike-fineprint">
          Adults only. Desktop mouse and keyboard required.{" "}
          <a href="/fps/models/ATTRIBUTION.md" target="_blank" rel="noreferrer">
            3D asset credits
          </a>
        </p>
      </div>
    </div>
  );
}
