/**
 * Records every dealer line with a neural voice (Cloudflare Workers AI, Deepgram Aura-2)
 * into public/audio/dealer/<id>.mp3.
 *
 *   CLOUDFLARE_ACCOUNT_ID=... npx tsx scripts/generate-dealer-voice.ts [--force] [--speaker athena]
 *
 * Auth: CLOUDFLARE_API_TOKEN (Workers AI permission), else the local `wrangler login` token.
 * Existing clips are kept unless --force, so adding a line only records the new one.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEALER_LINES, spokenForm } from "../src/lib/poker/dealer-lines";

const MODEL = "@cf/deepgram/aura-2-en";
const args = process.argv.slice(2);
const force = args.includes("--force");
const at = args.indexOf("--speaker");
const speaker = at >= 0 && args[at + 1] ? args[at + 1]! : "athena";

function token(): string {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const candidates = [
    join(process.env.APPDATA ?? "", "xdg.config", ".wrangler", "config", "default.toml"),
    join(homedir(), ".config", ".wrangler", "config", "default.toml"),
    join(homedir(), ".wrangler", "config", "default.toml"),
  ];
  for (const f of candidates) {
    if (!existsSync(f)) continue;
    const m = /^oauth_token\s*=\s*"([^"]+)"/m.exec(readFileSync(f, "utf8"));
    if (m) return m[1]!;
  }
  throw new Error("No Cloudflare token: set CLOUDFLARE_API_TOKEN or run `npx wrangler login`.");
}

async function main() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!account) throw new Error("Set CLOUDFLARE_ACCOUNT_ID.");
  const auth = token();
  const out = join(process.cwd(), "public", "audio", "dealer");
  mkdirSync(out, { recursive: true });
  for (const [id, text] of Object.entries(DEALER_LINES)) {
    const file = join(out, `${id}.mp3`);
    if (existsSync(file) && !force) continue;
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: spokenForm(text), speaker, encoding: "mp3" }),
      },
    );
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("audio/")) {
      throw new Error(`${id}: HTTP ${res.status} ${type} ${(await res.text()).slice(0, 300)}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(file, buf);
    console.log(`${id}.mp3 ${(buf.length / 1024).toFixed(1)} KB`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
