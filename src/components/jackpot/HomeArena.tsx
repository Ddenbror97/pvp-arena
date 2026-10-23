import { useEffect } from "react";
import room from "@/assets/jackpot/room.webp";
import type { JackpotPaint } from "@/lib/first-paint";
import { JackpotStage } from "./JackpotStage";
import { RecentGames } from "./RecentGames";

export default function HomeArena({ chat }: { chat: JackpotPaint["chat"] }) {
  useEffect(() => {
    // The intro stays up until the stage is mounted, so it never opens onto a blank main.
    window.dispatchEvent(new Event("pvp:home-ready"));
  }, []);

  return (
    <div className="jp-home">
      <img
        className="jp-room"
        src={room}
        alt=""
        width={1280}
        height={720}
        decoding="async"
        fetchPriority="high"
      />
      <div className="jp-room-shade" aria-hidden />
      <div className="jp-home-body">
        <JackpotStage chat={chat} />
        <RecentGames />
      </div>
    </div>
  );
}
