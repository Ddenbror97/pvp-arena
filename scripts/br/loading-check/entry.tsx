import { createRoot } from "react-dom/client";
import { BrMatch } from "../../../src/components/fps/BrMatch";
import { BR_RULESET_VERSION } from "../../../src/lib/fps/br/ruleset";
import { WORLD_ASSETS } from "../../../src/lib/fps/br/world";
import { ITEMS } from "../../../src/lib/fps/br/items";

// Isolated component integration fixture. Only admission, transport and the GPU arena are
// substituted by the test bundler; BrMatch and its actual loading screen run unchanged.
const qa = {
  created: false,
  admissions: 0,
  sockets: 0,
  assetsReady: false,
  snapshots: 0,
  presented: false,
  inventory: false,
  backgroundClicks: 0,
  kit: {
    hp: 100,
    active: 0,
    guns: [
      { item: "ak47", mag: 30, optic: "sight-red", muzzle: "silencer" },
      { item: "m4", mag: 30, optic: null, muzzle: null },
    ],
    helmet: { item: "helmet-1", durability: 100 },
    vest: { item: "vest-1", durability: 100 },
    plates: [null, null, null],
    backpack: "backpack-1",
    capacity: 40,
    bag: Object.entries(ITEMS)
      .filter(([, d]) => d.category !== "weapon")
      .map(([item, d]) => ({
        item,
        qty: 2,
        ...("durability" in d ? { durability: d.durability } : {}),
      })),
    heal: null,
    reloadUntil: 0,
    drawUntil: 0,
    kills: 0,
    dead: false,
    tablet: null,
  },
  baseline: { route: false, loot: false, doors: false },
  release: () => {},
  fail: () => {},
  hud: (_: unknown) => {},
};
declare global {
  interface Window {
    qa: typeof qa;
  }
}
window.qa = qa;
addEventListener("mousedown", () => {
  qa.backgroundClicks++;
});
class Socket {
  static OPEN = 1;
  readyState = 1;
  onopen?: () => void;
  onmessage?: (e: { data: string }) => void;
  onclose?: (e: { code: number; reason: string }) => void;
  constructor() {
    qa.sockets++;
    setTimeout(() => {
      this.onopen?.();
      if (location.search.includes("stall")) return;
      this.onmessage?.({
        data: JSON.stringify({
          type: "welcome",
          worldRevision: WORLD_ASSETS.revision,
          rulesVersion: BR_RULESET_VERSION,
        }),
      });
      this.onmessage?.({
        data: JSON.stringify({
          type: "br-snapshot",
          route: { a: [0, 0], b: [0, 1000], dir: [0, 1], length: 1000 },
          loot: { add: [[42, 0, 0, 0, 0, 30, -1, -1, -1, -1]], del: [] },
          doors: { open: [1, 2] },
        }),
      });
      // As on the Worker: the route is not repeated on subsequent snapshots.
      setTimeout(() => this.onmessage?.({ data: JSON.stringify({ type: "br-snapshot" }) }), 50);
    }, 0);
  }
  send() {}
  close(code: number, reason: string) {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
}
window.WebSocket = Socket as unknown as typeof WebSocket;
createRoot(document.getElementById("root")!).render(<BrMatch />);
