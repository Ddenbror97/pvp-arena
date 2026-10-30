import fs from "node:fs";
import { assertStaging } from "./staging-lib.mjs";
assertStaging();
const config = fs.readFileSync(
  "C:/Users/Wesc9/AppData/Roaming/xdg.config/.wrangler/config/default.toml",
  "utf8",
);
const token = /oauth_token\s*=\s*"([^"]+)"/.exec(config)?.[1];
if (!token) throw Error("Wrangler OAuth unavailable");
const account = "99b13936a7e1cf50c85e15d7b360ca63";
const from = process.argv[2] ?? new Date(Date.now() - 3600000).toISOString();
if (!Number.isFinite(Date.parse(from))) throw Error("Invalid metrics start time");
const to = process.argv[3] ?? new Date().toISOString();
if (!Number.isFinite(Date.parse(to)) || Date.parse(to) <= Date.parse(from))
  throw Error("Invalid metrics end time");
const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
const inventory = await (
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/durable_objects/namespaces`,
    { headers },
  )
).json();
const namespace = inventory.result?.find(
  (n) => n.script === "pvpspinarena-fps-staging" && n.class === "DuelRoom",
);
if (!namespace) throw Error("Exact staging namespace unavailable");
const filter = `namespaceId:${JSON.stringify(namespace.id)},datetime_geq:${JSON.stringify(from)},datetime_leq:${JSON.stringify(to)}`;
const query = `{viewer{accounts(filter:{accountTag:"${account}"}){
durableObjectsPeriodicGroups(limit:1000,filter:{${filter}}){count dimensions{coloCode datetimeMinute} max{activeWebsocketConnections memoryUsageBytes} quantiles{memoryUsageBytesP50 memoryUsageBytesP95 memoryUsageBytesP99} sum{cpuTime duration activeTime exceededCpuErrors exceededMemoryErrors fatalInternalErrors inboundWebsocketMsgCount outboundWebsocketMsgCount subrequests}}
durableObjectsInvocationsAdaptiveGroups(limit:1000,filter:{${filter}}){sum{requests errors wallTime} quantiles{cpuTimeP50 cpuTimeP95 cpuTimeP99 wallTimeP50 wallTimeP95 wallTimeP99} dimensions{coloCode}}
}}}`;
const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
  method: "POST",
  headers,
  body: JSON.stringify({ query }),
});
const body = await response.json();
if (!response.ok || body.errors?.length)
  throw Error("Cloudflare metrics query failed: " + JSON.stringify(body.errors));
const report = {
  from,
  to,
  namespace: namespace.id,
  scope:
    "Fresh staging namespace; adaptive provider metrics, not per-player or production capacity",
  data: body.data,
};
fs.writeFileSync(
  "test-results/remediation-cloudflare-metrics.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    from,
    to,
    periodicRows: body.data.viewer.accounts[0].durableObjectsPeriodicGroups.length,
    invocationRows: body.data.viewer.accounts[0].durableObjectsInvocationsAdaptiveGroups.length,
  }),
);
