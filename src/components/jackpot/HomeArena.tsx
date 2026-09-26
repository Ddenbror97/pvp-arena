import { JackpotStage } from "./JackpotStage";
import { RecentGames } from "./RecentGames";

/** Isolated so the homepage overlay can paint before this chunk downloads. */
export default function HomeArena() {
  return (
    <>
      <JackpotStage />
      <RecentGames />
    </>
  );
}
