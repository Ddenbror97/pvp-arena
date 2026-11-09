import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { BrAccessGate } from "../src/components/fps/BrAccessGate";
import { StrikeModePicker } from "../src/components/fps/StrikeModePicker";

const state = vi.hoisted(() => ({
  auth: { ready: true, userId: null as string | null },
  access: { data: false as boolean | undefined, isPending: false, isError: false },
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => state.auth }));
vi.mock("@/lib/fps/br/use-access", () => ({ useBrAccess: () => state.access }));
const router = createRouter({ routeTree: createRootRoute(), history: createMemoryHistory() });
const render = (element: React.ReactNode) =>
  renderToStaticMarkup(<RouterContextProvider router={router}>{element}</RouterContextProvider>);
const gate = () =>
  render(
    <BrAccessGate>
      <div data-match="mounted">BR match</div>
    </BrAccessGate>,
  );

beforeEach(() => {
  state.auth = { ready: true, userId: null };
  state.access = { data: false, isPending: false, isError: false };
});

describe("BR direct route gate (public release)", () => {
  it("asks anonymous visitors to sign in and never mounts the match", () => {
    state.auth.userId = null;
    expect(gate()).toContain("Sign in");
    expect(gate()).toContain('href="/auth"');
    expect(gate()).not.toContain("data-match");
  });
  it("waits for authentication", () => {
    state.auth.ready = false;
    state.access.isPending = true;
    expect(gate()).toContain("Loading");
    expect(gate()).not.toContain("data-match");
  });
  it("mounts only the fullscreen match for any signed-in player", () => {
    state.auth.userId = "player";
    state.access.data = true;
    expect(gate()).not.toContain("<p");
    expect(gate()).toContain('data-match="mounted"');
  });
  it("a stale positive answer after sign-out does not mount the match", () => {
    state.auth.userId = null;
    state.access.data = true;
    expect(gate()).not.toContain("data-match");
  });
});

describe("BR mode picker", () => {
  it.each([true, false, null])(
    "signed-out visitors are asked to sign in on desktop=%j",
    (desktop) => {
      const html = render(
        <StrikeModePicker mode="battle" desktop={desktop} onSelect={() => {}} onPlay={() => {}} />,
      );
      expect(html).toContain("Sign in to play");
      expect(html).not.toContain('href="/fps-br"');
      expect(html).toMatch(/class="strike-primary strike-play-now" disabled/);
    },
  );
  it("shows the Play Now link only on desktop", () => {
    const props = {
      mode: "battle" as const,
      battleAllowed: true,
      onSelect: () => {},
      onPlay: () => {},
    };
    expect(render(<StrikeModePicker {...props} desktop />)).toContain('href="/fps-br"');
    for (const desktop of [null, false]) {
      const html = render(<StrikeModePicker {...props} desktop={desktop} />);
      expect(html).toContain("Desktop only");
      expect(html).not.toContain('href="/fps-br"');
    }
  });
  it("keeps public duel Play Now enabled", () => {
    const html = render(
      <StrikeModePicker mode="duel" desktop onSelect={() => {}} onPlay={() => {}} />,
    );
    expect(html).toContain("Play Now");
    expect(html).not.toContain("disabled");
  });
});
