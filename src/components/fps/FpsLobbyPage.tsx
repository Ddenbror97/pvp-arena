import { DuelLobby } from "./DuelLobby";
import { FairPlayNotice } from "./FairPlayNotice";

/** Shared by the homepage and the existing FPS lobby URL. */
export function FpsLobbyPage() {
  return (
    <>
      <FairPlayNotice />
      <DuelLobby />
    </>
  );
}
