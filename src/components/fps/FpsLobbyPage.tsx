import { useEffect } from "react";
import { DuelLobby } from "./DuelLobby";
import { FairPlayNotice } from "./FairPlayNotice";

/** Shared by the homepage and the existing FPS lobby URL. */
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
