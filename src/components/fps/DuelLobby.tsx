import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Crosshair,
  ShieldCheck,
  Trophy,
  Users,
  LockKeyhole,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchDuelLobby, fetchDuelRankings, duelError } from "@/lib/fps/api";
import { duelAction } from "@/lib/fps/duel.functions";
import { duelMoney, duelQuote, type DuelView } from "@/lib/fps/quote";
import "./duel.css";

export function DuelLobby() {
  const { userId, profile } = useAuth();
  const qc = useQueryClient(),
    navigate = useNavigate(),
    action = useServerFn(duelAction);
  const lobby = useQuery({
    queryKey: ["fps-lobby", userId],
    queryFn: fetchDuelLobby,
    refetchInterval: 5000,
    retry: 1,
  });
  const rankings = useQuery({
    queryKey: ["fps-rankings"],
    queryFn: fetchDuelRankings,
    staleTime: 60_000,
    retry: false,
  });
  const [stake, setStake] = useState(0),
    [format, setFormat] = useState<5 | 9>(5),
    [isPrivate, setPrivate] = useState(false),
    [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const key = useRef<string | null>(null);
  const data = lobby.data,
    quote = duelQuote(stake);
  const [roomId, setRoomId] = useState(""),
    [invite, setInvite] = useState("");
  const run = async (table?: DuelView) => {
    if (busy || !accepted || !userId) return;
    setBusy(true);
    setError(null);
    key.current ??= crypto.randomUUID();
    try {
      const response = (await action({
        data: table
          ? { action: "join", matchId: table.id, key: key.current }
          : { action: "enter", stake, bestOf: format, private: isPrivate, key: key.current },
      })) as { match_id?: string; id?: string };
      const id = response.match_id ?? response.id;
      if (!id) throw new Error("DUEL_REQUEST_FAILED");
      key.current = null;
      await navigate({ to: "/fps/$matchId", params: { matchId: id } });
    } catch (e) {
      setError(duelError(e));
    } finally {
      setBusy(false);
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    }
  };
  const change = () => {
    key.current = null;
    setAccepted(false);
  };
  return (
    <div className="duel-lobby">
      <section className="duel-hero">
        <img
          className="duel-hero-art"
          src="/fps/arena-reference.png"
          alt="Original PVPspinArena tactical arena with purple lighting and symmetrical cover"
          width="1672"
          height="941"
          fetchPriority="high"
        />
        <div className="duel-hero-shade" />
        <div className="duel-hero-copy">
          <span className="duel-eyebrow">
            PVP ORIGINALS <span>01 / DUEL</span>
          </span>
          <h1>
            ONE ARENA.
            <br />
            <em>ONE WINNER.</em>
          </h1>
          <p>
            Read the angle. Hold your nerve.
            <br />A tactical 1v1 where every round is yours to earn.
          </p>
          <div className="duel-hero-tags">
            <span>
              <Crosshair size={14} /> Pure skill
            </span>
            <span>
              <Users size={14} /> 1v1
            </span>
            <span>
              <ShieldCheck size={14} /> Server controlled
            </span>
          </div>
        </div>
        <div className="duel-map-label">
          <span>THE FOUNDRY</span>
          <small>Symmetrical arena · Rifle + pistol</small>
        </div>
      </section>
      <div className="duel-lobby-grid">
        <section className="duel-panel duel-entry">
          <div className="duel-section-heading">
            <div>
              <span className="duel-eyebrow">YOUR NEXT MATCH</span>
              <h2>Make your stand.</h2>
            </div>
            <Crosshair />
          </div>
          <p className="duel-muted">
            {profile?.username ? `Welcome back, ${profile.username}. ` : ""}Desktop mouse and
            keyboard required.
          </p>
          <label className="duel-label">
            Entry per player <span>USD balance</span>
          </label>
          <div className="duel-segments">
            {[
              ...(data?.practice_allowed !== false ? [0] : []),
              ...(data?.cash_enabled ? data.stakes : []),
            ].map((s) => (
              <button
                key={s}
                className={stake === s ? "selected" : ""}
                onClick={() => {
                  setStake(s);
                  change();
                }}
              >
                {s === 0 ? "Practice" : duelMoney(s)}
              </button>
            ))}
          </div>
          {!data?.cash_enabled && (
            <p className="duel-hint">
              Cash duels remain closed until multiplayer and ledger verification are complete.
              Practice does not move funds or ratings.
            </p>
          )}
          <label className="duel-label">
            Match length <span>First to {format === 5 ? 3 : 5}</span>
          </label>
          <div className="duel-segments">
            <button
              className={format === 5 ? "selected" : ""}
              onClick={() => {
                setFormat(5);
                change();
              }}
            >
              Best of 5 <small>First to 3</small>
            </button>
            <button
              className={format === 9 ? "selected" : ""}
              onClick={() => {
                setFormat(9);
                change();
              }}
            >
              Best of 9 <small>First to 5</small>
            </button>
          </div>
          <div className="duel-quote">
            <div>
              <span>Prize pool</span>
              <strong>{duelMoney(quote.pot)}</strong>
            </div>
            <div>
              <span>Platform fee · 5%</span>
              <b>{duelMoney(quote.fee)}</b>
            </div>
            <div>
              <span>Winner receives</span>
              <strong>{duelMoney(quote.payout)}</strong>
            </div>
          </div>
          <label className="duel-checkbox">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => {
                setPrivate(e.target.checked);
                change();
              }}
            />
            <LockKeyhole size={15} /> Private room — invitation only
          </label>
          <label className="duel-checkbox">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            I accept this entry, format, and the published match rules below.
          </label>
          {error && (
            <p className="duel-error" role="alert">
              {error}
            </p>
          )}
          {!userId ? (
            <Link className="duel-primary" to="/auth">
              Sign in to play <ArrowUpRight size={17} />
            </Link>
          ) : (
            <button
              className="duel-primary"
              onClick={() => void run()}
              disabled={
                busy ||
                !accepted ||
                !data?.enabled ||
                (stake === 0
                  ? !data.practice_allowed
                  : !data.cash_enabled || !data.stakes.includes(stake))
              }
            >
              {busy ? "Opening your room…" : isPrivate ? "Create private room" : "Find a duel"}
              <ArrowUpRight size={17} />
            </button>
          )}
          {lobby.isError ? (
            <p className="duel-error" role="status">
              {duelError(lobby.error)}
            </p>
          ) : (
            !data?.enabled && (
              <p className="duel-hint">
                FPS Duel is in release validation. Matchmaking opens after the match server is
                configured.
              </p>
            )
          )}
        </section>
        <section className="duel-panel duel-open">
          <div className="duel-section-heading">
            <div>
              <span className="duel-eyebrow">PUBLIC MATCHMAKING</span>
              <h2>Choose your rival.</h2>
            </div>
            <button
              className="duel-icon-button"
              aria-label="Refresh rooms"
              onClick={() => void lobby.refetch()}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          {data?.mine && (
            <Link to="/fps/$matchId" params={{ matchId: data.mine.id }} className="duel-resume">
              Your room is waiting <ArrowUpRight size={16} />
            </Link>
          )}
          <div className="duel-room-heading">
            <span>PLAYER / FORMAT</span>
            <span>ENTRY</span>
            <span>WINNER</span>
          </div>
          {lobby.isPending ? (
            <div className="duel-empty">Loading live rooms…</div>
          ) : data?.open.length ? (
            data.open.map((room) => (
              <div className="duel-room" key={room.id}>
                <div className="duel-room-player">
                  <span className="duel-avatar">{room.username.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{room.username}</strong>
                    <small>Best of {room.best_of} · Open seat</small>
                  </div>
                </div>
                <b>{duelMoney(room.stake)}</b>
                <div>
                  <strong>{duelMoney(duelQuote(room.stake).payout)}</strong>
                  <button
                    disabled={!accepted || !userId || busy || room.creator_id === userId}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Join ${room.username}: ${duelMoney(room.stake)} entry, best of ${room.best_of}, winner ${duelMoney(duelQuote(room.stake).payout)}?`,
                        )
                      )
                        void run(room);
                    }}
                  >
                    Join duel <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="duel-empty">
              <Crosshair size={32} />
              <h3>The arena is quiet.</h3>
              <p>
                Create a room and invite a real opponent.
                <br />
                No bots, simulated players, or automatic wagers.
              </p>
            </div>
          )}
          {!!data?.live?.length && (
            <div className="duel-invite">
              <div>
                <h3>Live in the arena</h3>
                <p>Public matches · 5-second spectator delay</p>
              </div>
              {data.live.map((room) => (
                <Link
                  key={room.id}
                  to="/fps/$matchId"
                  params={{ matchId: room.id }}
                  search={{ spectate: true }}
                  className="duel-secondary"
                >
                  Watch {room.username}
                </Link>
              ))}
            </div>
          )}
          <div className="duel-loadout">
            <div>
              <span className="duel-eyebrow">STANDARD LOADOUT</span>
              <h3>
                Equal equipment.
                <br />
                Different instincts.
              </h3>
              <p>
                Rifle + pistol. Fixed damage, recoil and movement rules. No purchasable advantages.
              </p>
            </div>
            <img
              src="/fps/rifle-reference.png"
              width="2000"
              height="800"
              loading="lazy"
              alt="Purple PVPspinArena rifle artwork; the playable weapon uses an original procedural model"
            />
          </div>
          <div className="duel-invite">
            <LockKeyhole size={17} />
            <div>
              <h3>Have an invitation?</h3>
              <p>Open the complete invitation link to inspect the room's terms before joining.</p>
            </div>
            <input
              aria-label="Invitation link"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Paste private room link"
            />
            <button
              onClick={() => {
                try {
                  const u = new URL(roomId);
                  const m = /^\/fps\/([a-f0-9-]{36})$/.exec(u.pathname);
                  if (u.origin !== window.location.origin || !m) throw Error();
                  setInvite("");
                  window.location.assign(u.pathname + u.search);
                } catch {
                  setInvite("Use a room link from this site's origin.");
                }
              }}
            >
              Open
            </button>
            {invite && <small role="alert">{invite}</small>}
          </div>
        </section>
      </div>
      <section className="duel-panel" style={{ marginTop: 24 }}>
        <span className="duel-eyebrow">COMPETITIVE LADDER</span>
        <h2>Aim for the top.</h2>
        {rankings.data?.length ? (
          <ol>
            {rankings.data.map((row) => (
              <li key={row.id} className="duel-room">
                <strong>{row.username}</strong>
                <span>{row.rating} Elo</span>
                <span>
                  {row.wins} wins / {row.played} matches
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="duel-muted">
            {rankings.isError
              ? "Rankings are unavailable while setup completes."
              : "The ladder opens with verified public cash results. Private rooms and practice do not affect rank."}
          </p>
        )}
      </section>
      <section className="duel-rules">
        <span className="duel-eyebrow">KNOW THE RULES</span>
        <h2>Your aim. Your result.</h2>
        <div>
          <article>
            <Trophy />
            <h3>Win the rounds</h3>
            <p>
              Best of 5 needs 3 round wins; best of 9 needs 5. A round lasts 60 seconds. Higher
              health wins at timeout; equal health draws. Three drawn rounds cancel the match.
            </p>
          </article>
          <article>
            <ShieldCheck />
            <h3>The server decides</h3>
            <p>
              Movement, ammunition, hits, scores and outcomes are validated by the match server. The
              browser cannot award damage or request a payout.
            </p>
          </article>
          <article>
            <Users />
            <h3>Room to reconnect</h3>
            <p>
              Both players must ready up within 60 seconds. A disconnect has a 30-second reconnect
              window. Both absent or an interrupted server cancels for a refund; a completed result
              retries settlement.
            </p>
          </article>
        </div>
        <p className="duel-hint">
          Spectators of public matches see a delayed view. Private rooms cannot be spectated. Cash
          rules and availability are subject to release verification. Adults only.{" "}
          <a href="/fps/models/ATTRIBUTION.md" target="_blank" rel="noreferrer">
            3D asset credits
          </a>
        </p>
      </section>
    </div>
  );
}
