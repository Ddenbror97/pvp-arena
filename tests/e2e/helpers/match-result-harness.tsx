import { createRoot } from "react-dom/client";
import { useState } from "react";
import { MatchResult, type MatchResultProps } from "../../../src/components/fps/MatchResult";

export function mountResult(host: Element, extra: Partial<MatchResultProps> = {}) {
  function Result() {
    const [busy, setBusy] = useState(false);
    return (
      <div
        className="duel-game duel-show-result"
        style={{ minHeight: "100vh", background: "#171322" }}
      >
        <MatchResult
          winner={{ id: "a", username: "ddenbror97", avatar_url: null }}
          score={[7, 4]}
          mapName="Dustfront"
          practice={false}
          cancelled={false}
          settled
          spectate={false}
          stake={100}
          available={800}
          checkingBalance={false}
          balanceError={false}
          error={null}
          {...extra}
          busy={busy}
          onPlayAgain={() => {
            setBusy(true);
            document.body.dataset.replay = String(Number(document.body.dataset.replay ?? 0) + 1);
          }}
          lobbyLink={<a href="/fps-duel">Back to lobby</a>}
          walletLink={<a href="/wallet">Open wallet</a>}
        />
      </div>
    );
  }
  createRoot(host).render(<Result />);
}
