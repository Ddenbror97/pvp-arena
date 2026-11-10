/**
 * Battle royale startup check (headless Chromium): the real BrMatch behind the stand-in room
 * of entry.tsx. Sign-in, admission and the router are bundled out. Prints the startup log and
 * fails unless the match reaches its first frame (the loading screen leaves).
 *
 *   node scripts/br/startup-sim/capture.mjs [seconds]
 */
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const seconds = Number(process.argv[2] ?? 150);
const STUBS = {
  "@/lib/auth": `export const useAuth = () => ({ userId: "local", user: { id: "local" } });`,
  "@tanstack/react-start": `export const useServerFn = (fn) => fn;`,
  "@/lib/fps/br/br.functions": `export const brAdmission = async () => ({ url: "wss://room.test/br/sim/socket?ticket=sim", matchId: "sim" });`,
  "@tanstack/react-router": `import { createElement } from "react";
export const Link = ({ to, children, ...rest }) => createElement("a", { href: String(to), ...rest }, children);
export const useNavigate = () => () => {};`,
};
const js = (
  await build({
    entryPoints: [path.join(ROOT, "scripts/br/startup-sim/entry.tsx")],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    alias: { "@": path.join(ROOT, "src") },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "error",
    loader: { ".webp": "dataurl", ".png": "dataurl", ".jpg": "dataurl", ".css": "empty" },
    plugins: [
      {
        name: "stubs",
        setup(b) {
          b.onResolve({ filter: /^@/ }, (a) =>
            a.path in STUBS ? { path: a.path, namespace: "stub" } : undefined,
          );
          b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({
            contents: STUBS[a.path],
            resolveDir: ROOT,
            loader: "js",
          }));
        },
      },
    ],
  })
).outputFiles[0].text;
const css = ["src/components/fps/duel.css", "src/components/fps/br.css"]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"))
  .join("\n");
const html = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#000;font-family:system-ui}#root{position:absolute;inset:0}${css}</style><div id=root></div><script type=module src=/sim.js></script>`;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") return res.end(html);
  if (url === "/sim.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  const file = path.join(ROOT, "public", url);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file))
    return res.writeHead(404).end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", (e) => console.log("pageerror", String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "domcontentloaded" });
let log = [];
const end = Date.now() + seconds * 1000;
while (Date.now() < end) {
  await new Promise((r) => setTimeout(r, 2000));
  log = await page.evaluate(() => window.startup?.log ?? []);
  if (log.some((l) => l.includes("screen: (no loading)")) && log.some((l) => l.includes("socket")))
    break;
}
console.log(log.join("\n"));
await browser.close();
server.close();
const played = log.some((l) => l.includes("socket")) && log.at(-1)?.includes("(no loading)");
console.log(played ? "PLAYING" : "NOT PLAYING");
process.exit(played ? 0 : 1);
