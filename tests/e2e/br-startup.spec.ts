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
    "@tanstack/react-router": `import React from 'react';export const Link=p=>React.createElement('a',p,p.children);`,
    "@/lib/fps/br/br.functions": `export const brAdmission=async()=>{window.qa.admissions++;return {url:'wss://isolated.test/br/socket'}};`,
    "@/lib/fps/br/loading": `export const BR_LOADING_IMAGE=null;export const warmBrLoadingImage=()=>{};`,
    "@/lib/fps/br/br-arena": `export function createBrArena(_host,_base,progress){const q=window.qa;q.created=true;return {
      ready:new Promise((resolve,reject)=>{q.release=()=>{q.assetsReady=true;progress(1,'Ready');resolve()};q.fail=()=>reject(Error('asset failure'));}),
      onHud:f=>q.hud=f,onFeed(){},setSender(){},snapshot(s){q.snapshots++;if(q.assetsReady&&s.route){q.baseline={route:true,loot:s.loot?.add[0]?.[0]===42,doors:s.doors?.open[0]===1};q.hud({phase:'waiting',myPhase:'ground',kit:null,onFoot:true});}},
      setScenePresented:v=>q.presented=v,setSensitivity(){},setVolume(){},setBinds(){},setViewDistance(){},setInventoryOpen(){},
      mapImage:()=>null,mapState:()=>({waypoint:null}),dispose(){},act(){},
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
            contents: `export const useBrFeed=()=>({onFeed(){},out:null});${["GameSettings", "BrSettingsSections", "TacticalMap", "BrCanopyGauges", "BrCentre", "BrEnd", "BrFeedView", "BrGasFx", "BrInventory", "BrLobbyCard", "BrStatus", "BrTablet", "BrTopStatus", "BrZone"].map((n) => `export const ${n}=()=>null;`).join("")}`,
            loader: "js",
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
    res.end('<div id="root"></div><script type="module" src="/fixture.js"></script>');
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
test("a connected socket without a usable first frame fails visibly instead of hanging at 100%", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(origin + "/?stall");
  await page.waitForFunction(() => window.qa?.created);
  await page.evaluate(() => window.qa.release());
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "99");
  await page.clock.runFor(30_100);
  await expect(page.getByRole("alert")).toContainText("did not finish connecting");
});
test("asset failure is visible and never admits an unready player", async ({ page }) => {
  await page.goto(origin);
  await page.waitForFunction(() => window.qa?.created);
  await page.evaluate(() => window.qa.fail());
  await expect(page.getByRole("alert")).toContainText("island could not be loaded");
  expect(await page.evaluate(() => window.qa.admissions)).toBe(0);
});
