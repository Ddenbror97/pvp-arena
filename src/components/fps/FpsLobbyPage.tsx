import { useEffect } from "react";
import { DuelLobby } from "./DuelLobby";
import { FairPlayNotice } from "./FairPlayNotice";

/** Public FPS homepage. */
export function FpsLobbyPage() {
  useEffect(() => {
    window.dispatchEvent(new Event("pvp:home-ready"));
  }, []);
  return (
    <>
      <FairPlayNotice />
      <DuelLobby />
    </>
  );
}
