import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Crosshair,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { fetchDuelLobby, fetchDuelRankings, duelError } from "@/lib/fps/api";
import { duelAction } from "@/lib/fps/duel.functions";
import { duelMoney, duelQuote, type DuelLobbyData } from "@/lib/fps/quote";
import { STRIKE_SHOWCASE } from "@/lib/fps/showcase";
import { warmArenaAssets, warmArenaRenderer } from "@/lib/fps/renderer-loader";
import { useFpsQueue } from "@/lib/fps/queue";
import { reserveArenaPointer, releaseArenaPointer } from "@/lib/fps/entry-capture";
import "./strike-lobby.css";

type OpenRoom = DuelLobbyData["open"][number];
const FACTS = [
  { icon: Users, title: "1v1", copy: "A real opponent. Your skill." },
  { icon: Crosshair, title: "Tactical", copy: "Move, aim and hold your angle." },
  { icon: Trophy, title: "Your prize", copy: "95% of the cash pot to the winner." },
  { icon: ShieldCheck, title: "Verified", copy: "Server-controlled hits and results." },
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

export function DuelLobby() {
  const { userId, profile } = useAuth(),
    navigate = useNavigate(),
    qc = useQueryClient();
  const action = useServerFn(duelAction);
  const lobby = useQuery({
    queryKey: ["fps-lobby", userId],
    queryFn: fetchDuelLobby,
    staleTime: 5000,
    refetchInterval: 5000,
    retry: 1,
  });
  const rankings = useQuery({
    queryKey: ["fps-rankings"],
    queryFn: fetchDuelRankings,
    staleTime: 60000,
    retry: false,
  });
  const [panel, setPanel] = useState<"games" | "create">("games");
  const [stake, setStake] = useState(100),
    [format, setFormat] = useState<5 | 9>(5);
  const [isPrivate, setPrivate] = useState(false),
    [accepted, setAccepted] = useState(false);
  const [selected, setSelected] = useState<OpenRoom | null>(null),
    [joinAccepted, setJoinAccepted] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState(""),
    [inviteError, setInviteError] = useState("");
  const [desktop, setDesktop] = useState<boolean | null>(null),
    [now, setNow] = useState(Date.now);
  const keys = useRef(new Map<string, string>());
  const data = lobby.data;
  const queue = useFpsQueue();
  const waiting = queue.data?.cash?.status === "WAITING" ? queue.data.cash : null;
  const [alertPermission, setAlertPermission] = useState<
    NotificationPermission | "unsupported" | null
  >(null);
  useEffect(() => {
    setAlertPermission("Notification" in window ? Notification.permission : "unsupported");
    const media = matchMedia("(pointer:fine) and (hover:hover)");
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
  const rooms = (data?.open ?? []).filter(
    (room) => Date.parse(room.expires_at) > now && room.stake > 0 && data?.cash_enabled,
  );
  const featured = rooms.find((room) => room.creator_id !== userId);
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
    if (busy || !desktop || !allowed(room?.stake ?? stake) || !(room ? joinAccepted : accepted))
      return;
    const token = room ? `join:${room.id}` : `create:${stake}:${format}:${isPrivate}`;
    const key = keys.current.get(token) ?? crypto.randomUUID();
    keys.current.set(token, key);
    warmArenaAssets();
    if (room) reserveArenaPointer(room.id);
    setBusy(true);
    setError(null);
    try {
      const result = (await action({
        data: room
          ? { action: "join", combatVersion: 2, matchId: room.id, key }
          : { action: "create", combatVersion: 2, stake, bestOf: format, private: isPrivate, key },
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
      setError(duelError(e));
    } finally {
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
      busy ||
      !desktop ||
      !data?.enabled ||
      !data.practice_allowed ||
      (data.mine && !data.mine.practice && data.mine.status !== "WAITING")
    )
      return;
    const key = keys.current.get("practice") ?? crypto.randomUUID();
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
      setBusy(false);
      void qc.invalidateQueries({ queryKey: ["fps-lobby"] });
      void qc.invalidateQueries({ queryKey: ["fps-queue"] });
    }
  }
  return (
    <div className="strike-lobby">
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
            <span className="strike-kicker">PVP ORIGINALS / TACTICAL 1V1</span>
            <h1 id="strike-title">
              <Crosshair aria-hidden />
              <span>
                PvP<span>Strike</span>
              </span>
            </h1>
            <p className="strike-tagline">One arena. One winner.</p>
            <p className="strike-lead">
              Your aim. Your movement.
              <br />
              Your next rival is waiting.
            </p>
            <ul className="strike-facts">
              {FACTS.map(({ icon: Icon, title, copy }) => (
                <li key={title}>
                  <Icon aria-hidden />
                  <div>
                    <strong>{title}</strong>
                    <span>{copy}</span>
                  </div>
                </li>
              ))}
            </ul>
            <span className="strike-desktop-note">Desktop · Mouse & keyboard</span>
          </div>

          <div className="strike-showcase">
            <div className="strike-matchup" aria-label="Preview matchup">
              <div>
                <PlayerAvatar
                  name={featured?.username ?? profile?.username ?? "Your seat"}
                  src={featured ? null : profile?.avatar_url}
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
                  <small>Your next challenger</small>
                </span>
                <span className="strike-seat-avatar">
                  <Users aria-hidden />
                </span>
              </div>
            </div>
            <div className="strike-arena-caption">
              <span>AIM ARENA</span>
              <strong>Your next duel starts here.</strong>
              <p>Choose an open game or create your own room.</p>
            </div>
            <div className="strike-showcase-bottom">
              <span>
                <Crosshair aria-hidden /> M4A1-S / AK-47 + pistol
              </span>
              <span>Best of 5 / Best of 9</span>
              <span>No download</span>
            </div>
          </div>

          <aside
            className={`strike-games${waiting ? " strike-queue-active" : ""}`}
            aria-label="PvPStrike lobby"
            onMouseEnter={() => {
              if (userId && desktop) warmArenaRenderer();
            }}
            onFocus={() => {
              if (userId && desktop) warmArenaRenderer();
            }}
          >
            <div className="strike-practice">
              <h2>Solo Practice</h2>
              <p>
                Face the arena bot. First to seven wins · Best of 13.
                <br />
                Free · No wager or rating changes.
              </p>
              <button
                type="button"
                className="strike-primary"
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
                {data?.practice ? "Resume Practice" : "Practice vs bot"} <Crosshair size={16} />
              </button>
              {error && (
                <p className="strike-error" role="alert">
                  {error}
                </p>
              )}
            </div>
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
                  {value === "games" ? "Open games" : "Create game"}
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
                  Room details{waiting.private ? " & private invitation" : ""}
                </Link>
                <button
                  className="strike-join"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void action({ data: { action: "cancel", matchId: waiting.id } })
                      .then(() => {
                        void qc.invalidateQueries({ queryKey: ["fps-queue"] });
                        void qc.invalidateQueries({ queryKey: ["fps-lobby"] });
                        void qc.invalidateQueries({ queryKey: ["wallet"] });
                      })
                      .catch((e) => setError(duelError(e)))
                      .finally(() => setBusy(false));
                  }}
                >
                  Cancel & refund
                </button>
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
            {lobby.isError && (
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
                <>
                  <div className="strike-panel-heading">
                    <h2>
                      Open games <span>{rooms.length}</span>
                    </h2>
                    <button
                      type="button"
                      aria-label="Refresh open games"
                      disabled={lobby.isFetching}
                      onClick={() => void lobby.refetch()}
                    >
                      <RefreshCw size={15} className={lobby.isFetching ? "animate-spin" : ""} />
                    </button>
                  </div>
                  {lobby.isPending ? (
                    <p className="strike-empty" role="status">
                      Loading open games…
                    </p>
                  ) : rooms.length === 0 ? (
                    <div className="strike-empty">
                      <Crosshair aria-hidden />
                      <h3>Be the first in.</h3>
                      <p>Create a room, choose your entry and let a real challenger join.</p>
                      <button
                        type="button"
                        className="strike-primary"
                        onClick={() => setPanel("create")}
                      >
                        Create a game <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <ul className="strike-room-list">
                      {rooms.map((room) => (
                        <li key={room.id}>
                          <PlayerAvatar
                            name={room.username}
                            color="#c084fc"
                            className="strike-row-avatar rounded-full"
                          />
                          <div className="strike-row-details">
                            <strong>{room.username}</strong>
                            <span>
                              {room.stake === 0 ? "Practice" : duelMoney(room.stake)} · Best of{" "}
                              {room.best_of}
                            </span>
                            <small>Winner {duelMoney(duelQuote(room.stake).payout)}</small>
                          </div>
                          {room.creator_id === userId ? (
                            <Link
                              to="/fps/$matchId"
                              params={{ matchId: room.id }}
                              className="strike-join"
                            >
                              Open
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="strike-join"
                              disabled={
                                busy || desktop !== true || !allowed(room.stake) || !!data?.mine
                              }
                              onClick={() => {
                                setSelected(room);
                                warmArenaAssets();
                                setJoinAccepted(false);
                                setError(null);
                              }}
                            >
                              Join
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="strike-panel-footnote">
                    Review the entry, format and prize before joining. No automatic wagers.
                  </p>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run();
                  }}
                >
                  <div className="strike-panel-heading">
                    <h2>Create game</h2>
                    <Crosshair size={17} />
                  </div>
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
                  <p className="strike-fineprint strike-entry-status">
                    {lobby.isPending
                      ? "Loading available entries…"
                      : data?.cash_enabled
                        ? "Use your available balance for cash entries. Practice is free."
                        : "Cash entries are currently closed. Practice is free and does not affect your balance or rating."}
                  </p>
                  <fieldset className="strike-fieldset">
                    <legend>Match length</legend>
                    <div className="strike-formats">
                      {([5, 9] as const).map((best) => (
                        <button
                          type="button"
                          key={best}
                          aria-pressed={format === best}
                          onClick={() => {
                            setFormat(best);
                            change();
                          }}
                        >
                          Best of {best}
                          <small>First to {best === 5 ? 3 : 5}</small>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label className="strike-check">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => {
                        setPrivate(e.target.checked);
                        change();
                      }}
                    />
                    <LockKeyhole size={14} />
                    Private room — invitation only
                  </label>
                  <Quote stake={stake} />
                  <label className="strike-check strike-consent">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    I accept this entry, format, and the published match rules below.
                  </label>
                  {error && (
                    <p className="strike-error" role="alert">
                      {error}
                    </p>
                  )}
                  {userId ? (
                    <button
                      type="submit"
                      onPointerEnter={() => {
                        if (userId && desktop) warmArenaAssets();
                      }}
                      onFocus={() => {
                        if (userId && desktop) warmArenaAssets();
                      }}
                      className="strike-primary"
                      disabled={
                        busy || !accepted || desktop !== true || !allowed(stake) || !!data?.mine
                      }
                    >
                      {busy ? "Creating…" : isPrivate ? "Create private room" : "Create game"}
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <Link to="/auth" className="strike-primary">
                      Sign in to play <ArrowRight size={16} />
                    </Link>
                  )}
                  <p className="strike-panel-footnote">
                    Human opponents only. Browse or play free Practice while waiting. Keep the site
                    open; two minutes offline closes the room for a full refund. Online rooms expire
                    after 24 hours. Both players have 60 seconds to ready up after a join.
                  </p>
                </form>
              )}
            </div>
            <div className="strike-invitation">
              <label htmlFor="strike-invite">
                <LockKeyhole size={14} />
                Have a private invitation?
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    const url = new URL(invite);
                    if (
                      url.origin !== location.origin ||
                      !/^\/fps\/[a-f0-9-]{36}$/.test(url.pathname)
                    )
                      throw Error();
                    setInviteError("");
                    location.assign(url.pathname + url.search);
                  } catch {
                    setInviteError("Paste a complete room link from this site.");
                  }
                }}
              >
                <input
                  id="strike-invite"
                  type="url"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  placeholder="Paste room link"
                  required
                />
                <button type="submit" aria-label="Open private invitation">
                  <ArrowRight size={17} />
                </button>
              </form>
              {inviteError && (
                <p className="strike-error" role="alert">
                  {inviteError}
                </p>
              )}
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
          <DialogTitle>Join {selected?.username}?</DialogTitle>
          <DialogDescription>
            Review this room’s terms. Joining reserves the entry shown below.
          </DialogDescription>
          {selected && (
            <>
              <p className="strike-join-format">
                Best of {selected.best_of} · First to {selected.best_of === 5 ? 3 : 5} round wins
              </p>
              <Quote stake={selected.stake} />
              <label className="strike-check">
                <input
                  type="checkbox"
                  checked={joinAccepted}
                  onChange={(e) => setJoinAccepted(e.target.checked)}
                />
                I accept this room’s entry, format and 5% fee.
              </label>
              {error && (
                <p className="strike-error" role="alert">
                  {error}
                </p>
              )}
              {userId ? (
                <button
                  type="button"
                  className="strike-primary"
                  disabled={busy || !joinAccepted || desktop !== true || !allowed(selected.stake)}
                  onClick={() => void run(selected)}
                >
                  {busy
                    ? "Joining…"
                    : selected.stake === 0
                      ? "Join practice"
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
                Best of 5 is first to 3. Best of 9 is first to 5. A round lasts 60 seconds; higher
                health wins at timeout. Three drawn rounds cancel the match.
              </p>
            </article>
            <article>
              <ShieldCheck />
              <h3>Control your recoil</h3>
              <p>
                Police carry a suppressed M4A1-S, Terrorists an AK-47. Both rifles are full auto
                with identical damage: tap or fire short bursts to recover faster. Head hits deal 34
                damage, chest 34, stomach 30 and legs 20. Three landed headshots eliminate at full
                health. The server controls ammunition, hits and results.
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
          {rankings.data?.length ? (
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
                : "The ladder starts with verified public cash results. Private rooms and practice do not affect your rank."}
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
