/**
 * The Tactical Tablet on its own (no game behind it): the real component over the real perk
 * rules (perkOperation), started from the slots in the page's query (active=a,b,c).
 */
import { useReducer } from "react";
import { createRoot } from "react-dom/client";
import { BrTablet } from "@/components/fps/BrTablet";
import type { BrKitView } from "@/lib/fps/br/match";
import {
  isPerkId,
  newTablet,
  perkOperation,
  type PerkOp,
  type TabletState,
} from "@/lib/fps/br/perks";

const q = new URLSearchParams(location.search);
const list = (k: string) => (q.get(k) ?? "").split(",").filter(isPerkId);
const start: TabletState = newTablet();
list("active").forEach((id, i) => (start.active[i] = id));

function App() {
  const [tablet, act] = useReducer((t: TabletState, a: PerkOp) => {
    const next = structuredClone(t);
    return perkOperation(next, a) ? t : next;
  }, start);
  return (
    <BrTablet
      kit={{ tablet } as unknown as BrKitView}
      act={(a) => a.act === "perk" && act(a)}
      close={() => {}}
    />
  );
}
createRoot(document.getElementById("hud")!).render(<App />);
(window as unknown as { ready: boolean }).ready = true;
