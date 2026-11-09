/**
 * The battle royale HUD over the real client (owner's UI spec §F: screenshots): the in-page
 * match from entry.ts, with the React HUD of BrMatch mounted over it (status, ammo, compass,
 * zone, minimap, kill feed, gas, tactical map, inventory). No auth, no socket: the overlays
 * are opened by the capture script through `window.ui.open(...)`, as BrMatch does on its keys.
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { BrHud } from "../../../src/lib/fps/br/br-arena";
import {
  BrCentre,
  BrEnd,
  BrFeedView,
  BrGasFx,
  BrInventory,
  BrStatus,
  BrTopStatus,
  BrZone,
  useBrFeed,
} from "../../../src/components/fps/BrHud";
import { TacticalMap } from "../../../src/components/fps/TacticalMap";
import { sim } from "./entry";

type Overlay = "map" | "inventory" | null;
declare global {
  interface Window {
    ui: { open: (o: Overlay) => void; hud: () => BrHud | null };
  }
}

let latest: BrHud | null = null;
let setOverlayOut: (o: Overlay) => void = () => {};
window.ui = { open: (o) => setOverlayOut(o), hud: () => latest };

function Harness() {
  const arena = sim.arena;
  const [hud, setHud] = useState<BrHud | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const feed = useBrFeed();
  useEffect(() => {
    setOverlayOut = setOverlay;
    arena.onHud((h) => {
      latest = h;
      setHud(h);
    });
    arena.onFeed((e) => feed.onFeed(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => arena.setInventoryOpen(!!overlay), [overlay, arena]);
  if (!hud) return null;
  return (
    <>
      <BrCentre hud={hud} hit={feed.hit} />
      <BrStatus hud={hud} />
      <BrFeedView feed={feed} />
      {hud.myPhase !== "plane" && (
        <BrZone hud={hud} map={arena.mapImage()} waypoint={arena.mapState().waypoint} />
      )}
      {(hud.phase === "active" || (hud.phase === "plane" && hud.myPhase !== "plane")) && (
        <BrTopStatus hud={hud} />
      )}
      <BrGasFx hud={hud} />
      <BrEnd hud={hud} out={feed.out} leave={<button className="duel-primary">Leave</button>} />
      {overlay === "map" && (
        <TacticalMap arena={arena} alive={hud.alive} close={() => setOverlay(null)} />
      )}
      {overlay === "inventory" && hud.kit && (
        <BrInventory
          kit={hud.kit}
          nearby={hud.nearby}
          act={(a) => arena.act(a)}
          figure={arena.operatorFigure()}
          close={() => setOverlay(null)}
        />
      )}
      {hud.myPhase !== "ground" && hud.myPhase !== "swim" && hud.myPhase !== "plane" && (
        <div className="br-altimeter">
          <b>{Math.round(hud.agl)} m</b>
          <small>{Math.round(hud.speedKmh)} km/h</small>
        </div>
      )}
    </>
  );
}

void sim.ready.then(() => createRoot(document.getElementById("hud")!).render(<Harness />));
