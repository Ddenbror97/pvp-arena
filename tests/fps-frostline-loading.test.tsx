import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { ArenaLoadingScreen } from "../src/components/fps/ArenaLoadingScreen";
import { STRIKE_LOADING_IMAGE } from "../src/lib/fps/loading";
import {
  DEFAULT_LOADING_IMAGE,
  ROTATION_LOADING_IMAGES,
  loadingImageFor,
} from "../src/lib/fps/maps/loading-screens";
import { getMap, MAP_IDS, ROTATION_MAP_IDS } from "../src/lib/fps/maps/registry";

/** FROSTLINE's loading screen through the registry's per-map loading art (maps/loading-screens.ts). */
const router = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ["/fps/x"] }),
});
const render = (props: Parameters<typeof ArenaLoadingScreen>[0]) =>
  renderToStaticMarkup(
    createElement(RouterContextProvider, { router }, createElement(ArenaLoadingScreen, props)),
  );
const src = (html: string) => /<img[^>]*src="([^"]+)"/.exec(html)?.[1];

describe("FROSTLINE loading screen", () => {
  it("FROSTLINE has its own art; Dustfront keeps the existing image", () => {
    expect(loadingImageFor("frostline")).toMatch(/frostline-loading.*\.webp/);
    expect(loadingImageFor("dustfront")).toBe(STRIKE_LOADING_IMAGE);
    expect(STRIKE_LOADING_IMAGE).toBe(DEFAULT_LOADING_IMAGE);
    expect(DEFAULT_LOADING_IMAGE).toMatch(/arena-loading/);
    expect(loadingImageFor("frostline")).not.toBe(DEFAULT_LOADING_IMAGE);
  });

  it("falls back to the default art for a missing, unknown or art-less map", () => {
    for (const id of [undefined, null, "", "not-a-map", "FROSTLINE"])
      expect(loadingImageFor(id)).toBe(DEFAULT_LOADING_IMAGE);
    for (const id of MAP_IDS) expect(loadingImageFor(id)).toBeTruthy();
  });

  it("is in the random rotation, so its art is warmed with the other rotation maps", () => {
    expect(getMap("frostline").rotation).toBe(true);
    expect(ROTATION_MAP_IDS).toContain("frostline");
    expect(ROTATION_LOADING_IMAGES).toContain(loadingImageFor("frostline"));
    expect(ROTATION_LOADING_IMAGES).toContain(DEFAULT_LOADING_IMAGE);
  });

  it("renders the Dustfront loading screen with FROSTLINE's art and name", () => {
    const dust = render({ progress: 40, label: "Loading arena", error: null });
    expect(src(dust)).toBe(DEFAULT_LOADING_IMAGE);
    expect(dust).toContain("<h1>Dustfront</h1>");
    const frost = render({
      progress: 40,
      label: "Loading arena",
      error: null,
      mapName: getMap("frostline").name,
      image: loadingImageFor("frostline"),
    });
    expect(src(frost)).toBe(loadingImageFor("frostline"));
    expect(frost).toContain("<h1>Frostline</h1>");
    // Identical structure: the same progress bar, status, image size and back link.
    const shape = (html: string) =>
      html.replaceAll(src(html)!, "IMAGE").replace(/<h1>[^<]*<\/h1>/, "");
    expect(shape(frost)).toBe(shape(dust));
    expect(frost).toContain('aria-valuenow="40"');
    expect(frost).toContain('width="1672" height="941"');
  });
});
it("Bomb loading has a map title and smaller mode subtitle without the extra kicker", () => {
  const html = render({
    progress: 37,
    label: "Preparing assets",
    error: null,
    mapName: "Sandgate",
    modeName: "Defuse the bomb",
  });
  expect(html).toContain("<h1>Sandgate</h1>");
  expect(html).toContain('class="duel-loading-mode">Defuse the bomb</p>');
  expect(html).not.toContain("PVPSTRIKE");
  expect(html).toContain('aria-valuenow="37"');
  expect(html).toContain('class="sr-only"');
});
