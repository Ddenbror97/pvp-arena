import { useEffect } from "react";
import type { JackpotPaint } from "@/lib/first-paint";
import { JackpotStage } from "./JackpotStage";
import { RecentGames } from "./RecentGames";

export default function HomeArena({ chat }: { chat: JackpotPaint["chat"] }) {
  useEffect(() => {
    // The intro stays up until the stage is mounted, so it never opens onto a blank main.
    window.dispatchEvent(new Event("pvp:home-ready"));
  }, []);

  return (
    <>
      <JackpotStage chat={chat} />
      <RecentGames />
    </>
  );
}
