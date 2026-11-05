import { memo } from "react";
import { SANDGATE_BOXES, SANDGATE_WALLS, SANDGATE_BOMBSITES } from "@/lib/fps/sandgate-layout";
import type { BombView } from "@/lib/fps/bomb/snapshot";
// Ground-level collision footprints, generated from the shipped layout once, not per frame.
const geometry = [...SANDGATE_BOXES, ...SANDGATE_WALLS]
  .filter((b) => b.h >= 0.6 && b.y - b.h / 2 < 2.2)
  .map((b) => <rect key={b.id} x={b.x - b.w / 2} y={b.z - b.d / 2} width={b.w} height={b.d} />);
export const BombMinimap = memo(function BombMinimap({ view }: { view: BombView }) {
  const team = view.players[view.you]!.team;
  const bomb = view.bomb;
  const droppedBomb =
    team === "terrorist" &&
    bomb.state === "dropped" &&
    Number.isFinite(bomb.x) &&
    Number.isFinite(bomb.z)
      ? bomb
      : null;
  const watched =
    view.self.hp <= 0 && view.spectating !== null ? view.players[view.spectating]?.pose : null;
  return (
    <aside className="bomb-minimap" aria-label="Sandgate minimap">
      <div>
        <strong>SANDGATE</strong>
        <span>N ↑</span>
      </div>
      <svg
        viewBox="-40 -40 80 80"
        role="img"
        aria-label="North-up map with bombsites A and B, you and teammates"
      >
        <g fill="#aab6c45c" stroke="#dbe5f0aa" strokeWidth=".12">
          {geometry}
        </g>
        {Object.entries(SANDGATE_BOMBSITES).map(([id, s]) => (
          <g key={id}>
            <rect
              x={s.x0}
              y={s.z0}
              width={s.x1 - s.x0}
              height={s.z1 - s.z0}
              fill={
                view.bomb.state === "planted" && view.bomb.site === id ? "#f8717177" : "#fbbf2466"
              }
              stroke="#fbbf24"
              strokeWidth=".5"
            />
            <text
              x={(s.x0 + s.x1) / 2}
              y={(s.z0 + s.z1) / 2 + 2}
              textAnchor="middle"
              fontSize="7"
              fontWeight="800"
              fill="#fff"
              stroke="#302c22"
              strokeWidth=".3"
              paintOrder="stroke"
            >
              {id}
            </text>
          </g>
        ))}
        {view.players
          .filter((p) => p.slot !== view.you && p.team === team && p.alive && p.pose)
          .map((p) => (
            <circle
              key={p.slot}
              data-teammate={p.slot}
              cx={p.pose!.x}
              cy={p.pose!.z}
              r="1.35"
              fill="#6fa8ff"
              stroke="#0c2446"
              strokeWidth=".4"
            />
          ))}
        {view.self.hp > 0 && (
          <path
            data-you="true"
            d="M 0 -2.4 L -1.5 1.6 L 0 .8 L 1.5 1.6 Z"
            transform={`translate(${view.self.x} ${view.self.z}) rotate(${(-view.self.yaw * 180) / Math.PI})`}
            fill="#fff"
            stroke="#131d2c"
            strokeWidth=".5"
          />
        )}
        {watched && (
          <circle
            cx={watched.x}
            cy={watched.z}
            r="2.3"
            fill="none"
            stroke="white"
            strokeWidth=".6"
          />
        )}
        {droppedBomb && (
          <g
            className="bomb-minimap-dropped-bomb"
            data-dropped-bomb="true"
            transform={`translate(${droppedBomb.x} ${droppedBomb.z})`}
            aria-label="Dropped bomb"
          >
            <title>Dropped bomb — recover the C4</title>
            <circle r="3.2" fill="#ef444433" stroke="#ff5252" strokeWidth=".45" />
            <rect
              x="-1.8"
              y="-2"
              width="3.6"
              height="4"
              rx=".5"
              fill="#ef4444"
              stroke="#fff"
              strokeWidth=".3"
            />
            <path d="M -.8 -2 V -2.8 H .8 V -2" fill="none" stroke="#fff" strokeWidth=".4" />
          </g>
        )}
      </svg>
    </aside>
  );
});
