import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MatchResult, type MatchResultProps } from "../src/components/fps/MatchResult";

const base: MatchResultProps = {
  winner: { id: "a", username: "Arena winner", avatar_url: null },
  score: [7, 4],
  mapName: "Dustfront",
  practice: false,
  cancelled: false,
  settled: true,
  spectate: false,
  stake: 100,
  available: 100,
  checkingBalance: false,
  balanceError: false,
  busy: false,
  error: null,
  onPlayAgain: () => {},
  lobbyLink: <a href="/fps-duel">Back to lobby</a>,
  walletLink: <a href="/wallet">Open wallet</a>,
};
const render = (extra: Partial<MatchResultProps> = {}) =>
  renderToStaticMarkup(<MatchResult {...base} {...extra} />);
const disabled = (html: string) => /<button[^>]*disabled/.test(html);

describe("FPS match result and replay eligibility", () => {
  it("shows the actual winner, score and one cash replay with visible entry terms", () => {
    const html = render();
    expect(html).toContain("Arena winner");
    expect(html).toContain("Final score 7 to 4");
    expect(html).toContain("$1.00 entry");
    expect(html).toContain("5% fee");
    expect(html).toContain("$1.90");
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(disabled(html)).toBe(false); // exact available stake is enough
  });
  it("starts practice without a wallet or cash terms", () => {
    const html = render({ practice: true, available: undefined, balanceError: true });
    expect(disabled(html)).toBe(false);
    expect(html).not.toContain("5% fee");
    expect(html).toContain("No wager. No rating changes.");
  });
  it("blocks insufficient available funds and shows the exact shortfall", () => {
    const html = render({ stake: 500, available: 100 });
    expect(disabled(html)).toBe(true);
    expect(html).toContain("$4.00");
    expect(html).toContain('href="/wallet"');
  });
  it.each([{ settled: false }, { checkingBalance: true }, { busy: true }])(
    "blocks replay while pending: %j",
    (state) => {
      expect(disabled(render(state))).toBe(true);
    },
  );
  it("lets a failed balance lookup retry without claiming that funds are available", () => {
    const html = render({ balanceError: true, available: undefined });
    expect(disabled(html)).toBe(false);
    expect(html).toContain("Balance check unavailable");
    expect(html).not.toContain("Available $");
  });
  it("does not let spectators replay", () => {
    expect(render({ spectate: true })).not.toContain("<button");
  });
  it("keeps errors inline, with no nested confirmation dialog", () => {
    const html = render({ error: "Entry unavailable" });
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('role="dialog"');
    expect(html.match(/<button/g)).toHaveLength(1);
  });
  it("does not announce a winner for a cancelled match", () => {
    expect(render({ cancelled: true })).not.toContain("MATCH WINNER");
  });
});
