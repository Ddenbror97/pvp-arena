import { createRoot } from "react-dom/client";
import { OpenGames, type OpenGamesProps } from "../../../src/components/fps/OpenGames";
import { openGames } from "../../../src/lib/fps/open-games";

export function mountGames(host: Element, extra: Partial<OpenGamesProps> = {}) {
  const expires = new Date(Date.now() + 60000).toISOString();
  const stakes = [100, 200, 500, 1000];
  const rooms = Array.from({ length: 20 }, (_, i) => ({
    id: `room-${i}`,
    creator_id: `user-${i}`,
    opponent_id: null,
    username: i === 0 ? "challenger_with_a_very_long_username" : `Challenger ${i}`,
    status: "WAITING",
    private: false,
    stake: stakes[i % 4]!,
    best_of: 13 as const,
    expires_at: expires,
  }));
  const filtered = openGames(
    { enabled: true, cash_enabled: true, practice_allowed: true, stakes, open: rooms },
    Date.now(),
  );
  const mark = (key: string, value = "true") => {
    document.body.dataset[key] = value;
  };
  createRoot(host).render(
    <div
      className="strike-lobby"
      style={{
        minHeight: "100vh",
        background: "#100b18",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <aside
        className="strike-games"
        style={{ width: "min(430px, 100%)", height: "auto", minHeight: 0 }}
      >
        <div className="strike-panel">
          <OpenGames
            rooms={filtered}
            stakes={stakes}
            userId="viewer"
            available={500}
            loading={false}
            refreshing={false}
            failed={false}
            fresh
            enabled
            busy={false}
            blockedReason={null}
            {...extra}
            onRefresh={() => mark("refreshed")}
            onCreate={() => mark("create")}
            onReview={(room) => mark("review", room.id)}
            onOpen={(room) => mark("open", room.id)}
          />
        </div>
      </aside>
    </div>,
  );
}
