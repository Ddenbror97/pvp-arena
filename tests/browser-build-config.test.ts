import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertBrowserSupabaseBuild } from "../scripts/assert-browser-config.mjs";
const dirs: string[] = [];
const url = "https://example.supabase.co",
  key = "sb_publishable_test_build_key";
function output(source: string) {
  const dir = mkdtempSync(join(tmpdir(), "pvp-browser-config-"));
  dirs.push(dir);
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "assets", "client-test.js"), source);
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
describe("browser Supabase release guard", () => {
  it("accepts an actual browser bundle with the intended public configuration", () =>
    expect(() =>
      assertBrowserSupabaseBuild(output(JSON.stringify({ url, key })), url, key),
    ).not.toThrow());
  it("rejects a bundle missing public configuration even though runtime values are supplied", () =>
    expect(() => assertBrowserSupabaseBuild(output("process.env.SUPABASE_URL"), url, key)).toThrow(
      /Browser bundle lacks/,
    ));
  it("rejects a bundle built for another environment", () =>
    expect(() =>
      assertBrowserSupabaseBuild(
        output(JSON.stringify({ url: "https://staging.supabase.co", key })),
        url,
        key,
      ),
    ).toThrow(/Browser bundle lacks/));
  it("rejects a privileged key in the public key slot", () =>
    expect(() =>
      assertBrowserSupabaseBuild(output("unused"), url, "sb_secret_do_not_publish"),
    ).toThrow(/secret Supabase key/));
  it("rejects privileged credentials anywhere in the browser output", () =>
    expect(() =>
      assertBrowserSupabaseBuild(
        output(JSON.stringify({ url, key, secret: "private-server-only-value" })),
        url,
        key,
        ["private-server-only-value"],
      ),
    ).toThrow(/Privileged credential/));
  it("does not accept server-only configuration as browser configuration", () => {
    const dir = output("empty browser bundle");
    mkdirSync(join(dir, "server"));
    writeFileSync(join(dir, "server", "index.js"), JSON.stringify({ url, key }));
    expect(() => assertBrowserSupabaseBuild(dir, url, key)).toThrow(/Browser bundle lacks/);
  });
});
