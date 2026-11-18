import { useEffect, useState } from "react";
import { DuelLobby } from "./DuelLobby";
import { FairPlayNotice } from "./FairPlayNotice";
import { FpsMobileLanding } from "./FpsMobileLanding";
import "./fps-home-mobile.css";

/** Public FPS homepage. */
export function FpsLobbyPage() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = matchMedia("(max-width: 767px), (any-pointer: coarse) and (any-hover: none)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    window.dispatchEvent(new Event("pvp:home-ready"));
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <>
      {/* CSS selects the right layout before hydration; mobile then unmounts the live lobby. */}
      {!mobile && (
        <div className="fps-desktop-page">
          <FairPlayNotice />
          <DuelLobby />
        </div>
      )}
      <FpsMobileLanding />
    </>
  );
}
