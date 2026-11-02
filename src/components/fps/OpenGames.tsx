import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Crosshair, RefreshCw } from "lucide-react";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { duelMoney, duelQuote } from "@/lib/fps/quote";
import { OPEN_GAME_LIMIT, OPEN_GAME_PAGE_SIZE, type OpenGame } from "@/lib/fps/open-games";

export type OpenGamesProps = {
  rooms: OpenGame[];
  stakes: number[];
  userId: string | null;
  available?: number | undefined;
  loading: boolean;
  refreshing: boolean;
  failed: boolean;
  fresh: boolean;
  enabled: boolean;
  busy: boolean;
  blockedReason: string | null;
  onRefresh: () => void;
  onCreate: () => void;
  onReview: (room: OpenGame) => void;
  onOpen: (room: OpenGame) => void;
};

export function OpenGames(props: OpenGamesProps) {
  const {
    rooms,
    stakes,
    userId,
    available,
    loading,
    refreshing,
    failed,
    fresh,
    enabled,
    busy,
    blockedReason,
    onRefresh,
    onCreate,
    onReview,
    onOpen,
  } = props;
  const [entry, setEntry] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(0);
  const filtered = rooms.filter((room) => entry === "all" || room.stake === Number(entry));
  if (sort !== "recent")
    filtered.sort((a, b) => (sort === "low" ? a.stake - b.stake : b.stake - a.stake));
  const pages = Math.max(1, Math.ceil(filtered.length / OPEN_GAME_PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * OPEN_GAME_PAGE_SIZE;
  const shown = filtered.slice(start, start + OPEN_GAME_PAGE_SIZE);
  const changeEntry = (value: string) => {
    setEntry(value);
    setPage(0);
  };
  return (
    <div className="strike-open-games">
      <div className="strike-panel-heading">
        <h2>Open games {!loading && <span>{rooms.length}</span>}</h2>
        <button
          type="button"
          aria-label="Refresh open games"
          disabled={refreshing || busy}
          onClick={onRefresh}
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>
      <p className="strike-open-summary">Human opponents · Review before you enter</p>
      <div className="strike-room-filters">
        <label>
          Entry
          <select
            aria-label="Filter games by entry"
            value={entry}
            onChange={(e) => changeEntry(e.target.value)}
            disabled={loading || busy}
          >
            <option value="all">All entries</option>
            {stakes
              .filter((s) => s > 0)
              .map((s) => (
                <option key={s} value={s}>
                  {duelMoney(s)}
                </option>
              ))}
          </select>
        </label>
        <label>
          Sort
          <select
            aria-label="Sort open games"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
            disabled={loading || busy}
          >
            <option value="recent">Most recent</option>
            <option value="low">Lowest entry</option>
            <option value="high">Highest entry</option>
          </select>
        </label>
      </div>
      {blockedReason && (
        <p className="strike-room-warning" id="strike-room-blocked">
          {blockedReason}
        </p>
      )}
      {(failed || (!loading && !fresh)) && (
        <div className="strike-room-warning" role="status">
          {rooms.length
            ? "Connection interrupted. These rooms may have changed; reconnect before joining."
            : "We couldn’t load open games. Try reconnecting."}
          <button type="button" onClick={onRefresh} disabled={refreshing}>
            Reconnect
          </button>
        </div>
      )}
      <div className="strike-rooms-body" aria-busy={loading}>
        {loading ? (
          <div className="strike-room-skeletons" role="status" aria-label="Loading open games">
            {[0, 1, 2].map((n) => (
              <div key={n} className="strike-room-skeleton" aria-hidden />
            ))}
          </div>
        ) : failed && !rooms.length ? null : !enabled ? (
          <div className="strike-room-empty">
            <Crosshair size={26} aria-hidden />
            <h3>Cash games are paused.</h3>
            <p>Practice is available when enabled.</p>
          </div>
        ) : !shown.length ? (
          <div className="strike-room-empty">
            <Crosshair size={26} aria-hidden />
            <h3>{entry !== "all" ? "No games at this entry." : "Start the next duel."}</h3>
            <p>
              {entry !== "all"
                ? "Try another entry or create your own game."
                : "Create a room. We’ll alert you when a challenger joins."}
            </p>
            {entry !== "all" && (
              <button
                type="button"
                className="strike-filter-reset"
                onClick={() => changeEntry("all")}
              >
                Show all entries
              </button>
            )}
            <button type="button" className="strike-primary" onClick={onCreate} disabled={busy}>
              Create a game <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <ul className="strike-room-list strike-room-list-v2">
            {shown.map((room) => {
              const own = room.creator_id === userId;
              const short = available !== undefined && available < room.stake;
              return (
                <li key={room.id}>
                  <PlayerAvatar
                    name={room.username}
                    color="#c084fc"
                    className="strike-row-avatar rounded-full"
                  />
                  <div className="strike-row-details">
                    <strong title={room.username}>{room.username}</strong>
                    <span>
                      {own ? "Your room" : "Open seat"} · Best of {room.best_of}
                    </span>
                    {!own && short && <small className="strike-room-short">Low balance</small>}
                  </div>
                  <div className="strike-room-price">
                    <strong>{duelMoney(room.stake)}</strong>
                    <small>{duelMoney(duelQuote(room.stake).payout)} prize</small>
                  </div>
                  <button
                    type="button"
                    className="strike-join"
                    aria-label={`${own ? "Open your game" : "Review game with " + room.username} at ${duelMoney(room.stake)}`}
                    aria-describedby={!own && blockedReason ? "strike-room-blocked" : undefined}
                    disabled={busy || (!own && (!fresh || failed || !!blockedReason))}
                    onClick={() => (own ? onOpen(room) : onReview(room))}
                  >
                    {own ? "Open" : "Review"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {filtered.length > OPEN_GAME_PAGE_SIZE && (
        <nav className="strike-room-pagination" aria-label="Open games pages">
          <button
            type="button"
            aria-label="Previous games"
            disabled={currentPage === 0 || busy}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {currentPage + 1} of {pages}
          </span>
          <button
            type="button"
            aria-label="Next games"
            disabled={currentPage + 1 === pages || busy}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
      <p className="strike-panel-footnote">
        {rooms.length >= OPEN_GAME_LIMIT ? "Latest 20 rooms" : "Recent rooms"} · Updated
        automatically. Entry is reserved only when you confirm.
      </p>
    </div>
  );
}
