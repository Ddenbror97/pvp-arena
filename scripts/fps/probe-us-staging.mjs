import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { assertStaging } from "./staging-lib.mjs";
assertStaging();
const dir = path.resolve(".wrangler/preprod-us-probes");
fs.mkdirSync(dir, { recursive: true });
const token = randomBytes(32).toString("base64url");
const source = `export default {async fetch(request,env){
if(request.headers.get('Authorization')!=='Bearer '+env.TEST_TOKEN)return new Response('Forbidden',{status:403});
const targets=[['runtime','https://pvpspinarena-fps-staging.pvpspinarena.workers.dev/health'],['databaseREST',env.SUPABASE_URL+'/rest/v1/rpc/fps_stats'],['appSSR','https://pvpspinarena-staging.pvpspinarena.workers.dev/fps-duel']];
const result={ingressColo:request.cf?.colo,requestedRegion:env.TEST_REGION,samples:[]};
const trace=await (await fetch('https://www.cloudflare.com/cdn-cgi/trace')).text();result.egressTraceColo=/colo=([^\\n]+)/.exec(trace)?.[1]??null;
for(let i=0;i<10;i++)for(const [target,url]of targets){const start=performance.now();const response=await fetch(url,target==='databaseREST'?{method:'POST',headers:{apikey:env.PUBLIC_KEY,'Content-Type':'application/json'},body:'{}'}:{});await response.arrayBuffer();result.samples.push({target,ms:performance.now()-start,status:response.status});}
return Response.json(result,{headers:{'Cache-Control':'no-store'}});}};`;
fs.writeFileSync(path.join(dir, "index.mjs"), source);
async function run(args, input) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    p.stdout.on("data", (b) => (out += b));
    p.stderr.on("data", (b) => (out += b));
    p.stdin.end(input ?? "");
    p.on("close", (c) => {
      if (c) reject(Error("Probe deployment failed " + c));
      else resolve(out);
    });
    p.on("error", reject);
  });
}
const results = [];
try {
  for (const [label, region] of [
    ["east", "aws:us-east-1"],
    ["west", "aws:us-west-2"],
  ]) {
    const name = "pvpspinarena-probe-us-" + label,
      file = path.join(dir, label + ".json");
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          name,
          main: "index.mjs",
          compatibility_date: "2026-10-26",
          compatibility_flags: ["global_fetch_strictly_public"],
          workers_dev: true,
          placement: { region },
          vars: {
            TEST_REGION: region,
            SUPABASE_URL: process.env.SUPABASE_URL,
            PUBLIC_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
          },
        },
        null,
        2,
      ),
    );
    const output = await run(["deploy", "--config", file]);
    const url = output.match(new RegExp("https://" + name + "\\.[a-z0-9-]+\\.workers\\.dev"))?.[0];
    if (!url) throw Error("Probe URL missing");
    await run(["secret", "bulk", "--config", file], JSON.stringify({ TEST_TOKEN: token }));
    let r,
      propagationRetries = 0;
    do {
      try {
        r = await fetch(url, {
          headers: { Authorization: "Bearer " + token },
          signal: AbortSignal.timeout(120000),
        });
      } catch {
        if (propagationRetries++ >= 15) throw Error("Regional probe network unavailable: " + label);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      if (r.status !== 403 || propagationRetries++ >= 15) break;
      await r.arrayBuffer();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } while (true);
    if (!r.ok) throw Error("Probe HTTP " + r.status);
    const data = await r.json();
    results.push({ ...data, placement: r.headers.get("cf-placement"), region, propagationRetries });
    fs.writeFileSync(
      "test-results/preprod-us-probes.json",
      JSON.stringify(
        { scope: "Placed server probes, not end-user last-mile tests", results },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        region,
        placement: r.headers.get("cf-placement"),
        samples: data.samples.length,
        statuses: [...new Set(data.samples.map((s) => s.status))],
      }),
    );
  }
  fs.writeFileSync(
    "test-results/preprod-us-probes.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        scope:
          "Placed Cloudflare server-to-server probes; not US residential/mobile users, packet-loss or gameplay capacity",
        results,
      },
      null,
      2,
    ),
  );
} finally {
  // These temporary read-only probes must not remain as a public load generator.
  for (const label of ["east", "west"]) {
    const file = path.join(dir, label + ".json");
    if (fs.existsSync(file))
      try {
        await run(["delete", "--config", file, "--force"]);
      } catch {
        console.log("Probe cleanup requires review: " + label);
        process.exitCode = 1;
      }
  }
}
