import { POKER_ROOM, warmPokerRoom } from "@/lib/poker/assets";

// Start the decode as soon as the table chunk loads, before React paints the plate.
warmPokerRoom();

/** Full-bleed penthouse. One element for the whole table visit, decoded ahead of the felt. */
export function PokerRoom() {
  return (
    <div className="poker-env" aria-hidden>
      <img
        className="poker-room"
        src={POKER_ROOM}
        alt=""
        width={1280}
        height={720}
        decoding="sync"
        fetchPriority="high"
      />
    </div>
  );
}
