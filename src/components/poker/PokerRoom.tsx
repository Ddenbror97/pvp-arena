import room from "@/assets/poker/room.webp";

/** Full-bleed penthouse. The table route preloads this same URL at high priority. */
export function PokerRoom() {
  return (
    <div className="poker-env" aria-hidden>
      <img
        className="poker-room"
        src={room}
        alt=""
        width={1280}
        height={720}
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
