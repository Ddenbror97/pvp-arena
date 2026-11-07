import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { build } from "esbuild";
import { test, expect } from "@playwright/test";

let server: http.Server, origin: string;
test.use({ trace: "off", video: "off" });
test.beforeAll(async () => {
  const modules: Record<string, string> = {
    "@/lib/auth": `export const useAuth=()=>({userId:'isolated-admin'});`,
    "@tanstack/react-start": `export const useServerFn=f=>f;`,
    "@tanstack/react-router": `import React from 'react';export const Link=p=>React.createElement('a',{...p,href:p.to},p.children);`,
    "@/lib/fps/br/br.functions": `export const brAdmission=async()=>{window.qa.admissions++;if(location.search.includes('admission-stall')&&window.qa.admissions===1)return new Promise(()=>{});return {url:'wss://isolated.test/br/socket'}};`,
    "@/lib/fps/br/loading": `export const BR_LOADING_IMAGE=null;export const warmBrLoadingImage=()=>{};`,
    "@/lib/fps/br/br-arena": `export function createBrArena(_host,_base,progress){const q=window.qa;q.created=true;q.createdCount++;return {
      ready:new Promise((resolve,reject)=>{q.release=()=>{q.assetsReady=true;progress(1,'Ready');resolve()};q.fail=()=>reject(Error('asset failure'));}),
      onHud:f=>q.hud=f,onFeed(){},setSender(){},snapshot(s){q.snapshots++;if(q.assetsReady&&s.route){q.baseline={route:true,loot:s.loot?.add[0]?.[0]===42,doors:s.doors?.open[0]===1};if(!location.search.includes('slow-frame'))q.hud({phase:'waiting',myPhase:'ground',kit:q.kit,nearby:[],onFoot:true});}},
      setScenePresented:v=>q.presented=v,setSensitivity(){},setVolume(){},setBinds(){},setViewDistance(){},setInventoryOpen(v){q.inventory=v;},
      mapImage:()=>null,mapState:()=>({waypoint:null}),dispose(){q.disposedCount++;},act(){},relock(){},
    }};`,
  };
  const result = await build({
    entryPoints: ["scripts/br/loading-check/entry.tsx"],
    bundle: true,
    write: false,
    format: "esm",
    jsx: "automatic",
    alias: { "@": path.resolve("src") },
    loader: { ".css": "empty", ".webp": "dataurl" },
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "isolated-br-startup",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (args) => {
            if (args.path in modules) return { path: args.path, namespace: "fixture" };
            if (/^\.\/(BrHud|GameSettings|BrSettings|TacticalMap)$/.test(args.path))
              return { path: args.path, namespace: "overlay" };
          });
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
            contents: modules[args.path],
            loader: "js",
            resolveDir: process.cwd(),
          }));
          b.onLoad({ filter: /.*/, namespace: "overlay" }, () => ({
            contents: `import React from 'react';export {BrInventory} from '${path.resolve("src/components/fps/BrHud.tsx").replaceAll("\\", "/")}';export const GameSettings=p=>p.open?React.createElement('div',{role:'dialog','aria-label':'Game settings',style:{position:'absolute',inset:0,zIndex:20,padding:'200px'}},p.leaveAction):null;export const useBrFeed=()=>({onFeed(){},out:null});${["BrSettingsSections", "TacticalMap", "BrCanopyGauges", "BrCentre", "BrEnd", "BrFeedView", "BrGasFx", "BrLobbyCard", "BrStatus", "BrTablet", "BrTopStatus", "BrZone"].map((n) => `export const ${n}=()=>null;`).join("")}`,
            loader: "js",
            resolveDir: process.cwd(),
          }));
          // Optional local source override demonstrates the regression against the previous code.
          if (process.env.BR_STARTUP_SOURCE)
            b.onLoad({ filter: /components[/\\]fps[/\\]BrMatch\.tsx$/ }, () => ({
              contents: fs.readFileSync(process.env.BR_STARTUP_SOURCE!, "utf8"),
              loader: "tsx",
              resolveDir: path.resolve("src/components/fps"),
            }));
        },
      },
    ],
  });
  const js = result.outputFiles[0]!.text;
  server = http.createServer((req, res) => {
    if (req.url === "/fixture.js")
      return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
    const css =
      fs.readFileSync("src/components/fps/duel.css", "utf8") +
      fs.readFileSync("src/components/fps/br.css", "utf8");
    res.end(
      `<style>html,body{margin:0}.duel-game{position:relative;width:100vw;height:100vh}${css}</style><div id="root"></div><script type="module" src="/fixture.js"></script>`,
    );
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
test.afterAll(async () => {
  await new Promise<void>((r) => server?.close(() => r()));
});

test("delayed assets cannot lose the one-time route and loot baseline before auto-entry", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install();
  await page.goto(origin);
  await page.waitForFunction(() => window.qa?.created);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.qa.admissions)).toBe(0);
  expect(await page.evaluate(() => window.qa.sockets)).toBe(0);
  await expect(page.getByRole("progressbar")).toHaveCount(1);
  await page.evaluate(() => window.qa.release());
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  expect(await page.evaluate(() => window.qa.presented)).toBe(true);
  expect(await page.evaluate(() => window.qa.baseline)).toEqual({
    route: true,
    loot: true,
    doors: true,
  });
  expect(await page.evaluate(() => window.qa.admissions)).toBe(1);
  await page.clock.runFor(31_000);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("a connected socket without a usable first frame reconnects visibly instead of hanging at 99%", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(origin + "/?stall");
  await page.waitForFunction(() => window.qa?.created);
  await page.evaluate(() => window.qa.release());
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "99");
  await page.clock.runFor(30_100);
  await expect(page.getByRole("alert")).toContainText("Restoring match connection");
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);
});

test("a late first gameplay frame clears the timeout without reloading the island or flashing loading again", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(origin + "/?slow-frame");
  await page.waitForFunction(() => window.qa?.created);
  await page.evaluate(() => window.qa.release());
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "99");
  await page.clock.runFor(30_100);
  await expect(page.getByRole("alert")).toContainText("Preparing the first frame");
  expect(await page.evaluate(() => window.qa.sockets)).toBe(1);
  await page.evaluate(() =>
    window.qa.hud({
      phase: "waiting",
      myPhase: "ground",
      kit: window.qa.kit,
      nearby: [],
      onFoot: true,
    }),
  );
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.clock.runFor(61_000);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  expect(await page.evaluate(() => window.qa.createdCount)).toBe(1);
  expect(await page.evaluate(() => window.qa.presented)).toBe(true);
});

test("a stalled socket gets a fresh baseline and stale socket messages cannot interrupt entry", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(origin + "/?retry-socket");
  await page.waitForFunction(() => window.qa?.created);
  await page.evaluate(() => window.qa.release());
  await page.clock.runFor(31_000);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  expect(await page.evaluate(() => window.qa.sockets)).toBe(2);
  await page.evaluate(() =>
    window.qa.connections[0]!.onmessage?.({
      data: JSON.stringify({ type: "welcome", worldRevision: "old-build", rulesVersion: -1 }),
    }),
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => window.qa.baseline)).toEqual({
    route: true,
    loot: true,
    doors: true,
  });
});

test("a hung admission request is retried without rebuilding the island", async ({ page }) => {
  await page.clock.install();
  await page.goto(origin + "/?admission-stall");
  await page.waitForFunction(() => window.qa?.created);
  await page.evaluate(() => window.qa.release());
  await page.clock.runFor(17_000);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  expect(await page.evaluate(() => window.qa.admissions)).toBe(2);
  expect(await page.evaluate(() => window.qa.createdCount)).toBe(1);
});

test("slow assets keep the prepared arena and enter automatically without a retry button", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(origin);
  await page.waitForFunction(() => window.qa?.created);
  await page.clock.runFor(120_100);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.qa.createdCount)).toBe(1);
  expect(await page.evaluate(() => window.qa.disposedCount)).toBe(0);
  expect(await page.evaluate(() => window.qa.admissions)).toBe(0);
  await page.evaluate(() => window.qa.release());
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  expect(await page.evaluate(() => window.qa.admissions)).toBe(1);
});
test("asset failure is visible and never admits an unready player", async ({ page }) => {
  await page.goto(origin);
  await page.waitForFunction(() => window.qa?.created);
  await page.evaluate(() => window.qa.fail());
  await expect(page.getByRole("alert")).toContainText("island assets are unavailable");
  expect(await page.evaluate(() => window.qa.admissions)).toBe(0);
});

test("inventory clicks stay in the match/fullscreen, and leaving needs a separate confirmation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await page.waitForFunction(() => window.qa.created);
  await page.evaluate(() => window.qa.release());
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.keyboard.press("KeyB");
  await expect(page.getByRole("dialog", { name: "Inventory", exact: true })).toBeVisible();
  const count = await page.locator(".br-inv-cell").count();
  const before = await page.evaluate(() => window.qa.backgroundClicks);
  for (let i = 0; i < count; i++) await page.locator(".br-inv-cell").nth(i).click();
  await page.locator(".br-inventory-layer").click({ position: { x: 10, y: 10 } });
  expect(await page.evaluate(() => window.qa.backgroundClicks)).toBe(before);
  await expect(page.getByRole("dialog", { name: "Inventory", exact: true })).toBeVisible();
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  expect(page.url()).toBe(origin + "/");
  expect(page.isClosed()).toBe(false);
  await page.keyboard.press("KeyB");
  // Simulate Escape's pointer-unlock notification to open the actual match menu.
  await page.evaluate(() => {
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      value: document.querySelector(".duel-render-host"),
    });
    document.dispatchEvent(new Event("pointerlockchange"));
  });
  await page.waitForTimeout(30);
  await page.evaluate(() => {
    Object.defineProperty(document, "pointerLockElement", { configurable: true, value: null });
    document.dispatchEvent(new Event("pointerlockchange"));
  });
  await page.getByRole("button", { name: "Leave match", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Stay in match", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("link", { name: "Leave match", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Stay in match", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Stay in match", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(page.url()).toBe(origin + "/");
  expect(errors).toEqual([]);
});
