import { Component, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActionBar } from "../../../src/components/poker/ActionBar";
import { BuyInDialog } from "../../../src/components/poker/BuyInDialog";
import { LatestStatus } from "../../../src/components/slott/LatestStatus";
import type { Legal, PokerHand } from "../../../src/lib/poker/api";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    Reflect.set(window, "translationFailure", { name: error.name, message: error.message });
  }
  render() {
    return this.state.failed ? <h1>This page didn't load</h1> : this.props.children;
  }
}
function App({ mode }: { mode: string }) {
  const [busy, setBusy] = useState(false),
    [landed, setLanded] = useState(true);
  Reflect.set(window, "translationNext", () => setLanded((v) => !v));
  const act = () => {
    setBusy(true);
    setTimeout(() => setBusy(false), 150);
  };
  const legal: Legal = {
    seat: 0,
    to_call: 100,
    can_fold: true,
    can_check: false,
    can_call: true,
    call_amount: 100,
    can_raise: true,
    min_raise_to: 200,
    max_raise_to: 1000,
    current_bet: 100,
  };
  const hand = {
    id: 1,
    version: 1,
    big_blind: 50,
    current_bet: 100,
    players: [],
  } as unknown as PokerHand;
  return mode === "poker-action" ? (
    <ActionBar legal={legal} hand={hand} busy={busy} onAct={act} />
  ) : mode === "poker-buyin" ? (
    <BuyInDialog
      open
      onOpenChange={() => {}}
      typeId={1}
      title="Take a seat"
      min={100}
      max={5000}
      bb={50}
      busy={busy}
      onConfirm={act}
      error={null}
    />
  ) : (
    <div id="slot-status">
      <LatestStatus
        latest={
          {
            seat: "A",
            score: 50,
            grid: [1, 2, 3],
            lines: [],
            bonus_cents: 0,
            spin_no: 1,
          } as import("../../../src/lib/slott/api").SlotSpin
        }
        landed={landed}
        bonuses={[]}
        game={
          {
            status: "ACTIVE",
            base_spins: 10,
            creator: { username: "Alex" },
            opponent: { username: "Jamie" },
          } as import("../../../src/lib/slott/api").SlotGameView
        }
        turn="B"
        me="A"
        countdown={<span>5s</span>}
      />
    </div>
  );
}
export function mountTranslationFixture(mode: string) {
  const host = document.createElement("div");
  document.body.replaceChildren(host);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["poker-buyin", 1], {
    available: 10000,
    cash: 10000,
    min_buy_in: 100,
    max_buy_in: 5000,
  });
  createRoot(host).render(
    <Boundary>
      <QueryClientProvider client={qc}>
        <App mode={mode} />
      </QueryClientProvider>
    </Boundary>,
  );
}
