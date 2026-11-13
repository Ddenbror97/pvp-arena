// CI exercises local Postgres and mocked/local Workers. A test must never fall
// through to the production site, Supabase project or match Workers.
const net = require("node:net");
const tls = require("node:tls");
const http = require("node:http");
const https = require("node:https");
const forbidden = (host) =>
  /dkyabirifoixnfbmheay|(?:^|\.)pvpspinarena\.com$|pvpspinarena[^.]*\.pvpspinarena\.workers\.dev/i.test(
    String(host || ""),
  );
function inspect(value) {
  let host;
  if (typeof value === "string") {
    try {
      host = new URL(value).hostname;
    } catch {
      host = value;
    }
  } else if (value && typeof value === "object") {
    host = value.hostname || value.host || (value.url && new URL(value.url).hostname);
  }
  if (forbidden(host)) throw new Error("CI_POLICY: production network access refused");
}
for (const mod of [http, https])
  for (const name of ["request", "get"]) {
    const original = mod[name];
    mod[name] = function (...args) {
      inspect(args[0]);
      return original.apply(this, args);
    };
  }
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  for (const arg of args) inspect(arg);
  return connect.apply(this, args);
};
const tlsConnect = tls.connect;
tls.connect = function (...args) {
  for (const arg of args) inspect(arg);
  return tlsConnect.apply(this, args);
};
if (globalThis.fetch) {
  const original = globalThis.fetch;
  globalThis.fetch = function (input, ...rest) {
    inspect(input);
    return original.call(this, input, ...rest);
  };
}
require("node:module").syncBuiltinESMExports();
