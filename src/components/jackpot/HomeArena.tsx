import { useEffect } from "react";
import { JackpotStage } from "./JackpotStage";
import { RecentGames } from "./RecentGames";

/** Isolated so the homepage overlay can paint before this chunk downloads. */
export default function HomeArena() {
  useEffect(() => {
    // The intro has a minimum animation time, but must not open onto an empty
    // page while this lazy chunk is still downloading on a cold connection.
    window.dispatchEvent(new Event("pvp:home-ready"));
  }, []);

  return (
    <>
      <JackpotStage />
      <RecentGames />
    </>
  );
}
