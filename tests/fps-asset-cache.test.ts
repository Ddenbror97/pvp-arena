import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fetchFpsAsset, fpsAssetHashesBuilt, fpsAssetKey } from "@/lib/fps/asset-cache";
import { emitFpsAssetHashes } from "../scripts/emit-br-asset-hashes";

/**
 * Final performance audit 2026-11-24: the characters, weapons, sounds and clips the three modes
 * share were asked about again on every match (`max-age=0`). A stored copy whose content the
 * deploy lists is used as it is (asset-cache.ts); anything else goes to the server as before.
 */
const fp = (bytes: Uint8Array) => createHash("sha1").update(bytes).digest("hex").slice(0, 12);
const body = (text: string) => new TextEncoder().encode(text);

afterEach(() => vi.unstubAllGlobals());

describe("the other modes' file cache", () => {
  it("keys files under /fps/, never the island's /fps/br/", () => {
    expect(fpsAssetKey("https://pvpspinarena.com/fps/audio/ak47.ogg?x=1")).toBe("audio/ak47.ogg");
    expect(fpsAssetKey("/fps/models/police-swat.glb")).toBe("models/police-swat.glb");
    expect(fpsAssetKey("/fps/br/models/barn.lod0.glb")).toBeNull();
    expect(fpsAssetKey("/assets/index.js")).toBeNull();
  });

  it("is off outside a production build (tests, development): plain fetch", async () => {
    expect(fpsAssetHashesBuilt()).toBe(false);
    const fetch = vi.fn(async () => new Response("x"));
    vi.stubGlobal("fetch", fetch);
    await fetchFpsAsset("/fps/audio/a.ogg");
    expect(fetch).toHaveBeenCalledWith("/fps/audio/a.ogg");
  });

  it("uses the stored copy when it is the deployed file, without asking the server", async () => {
    const data = body("rifle");
    const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.cache === "force-cache" ? new Response(data) : new Response("server"),
    );
    vi.stubGlobal("fetch", fetch);
    const hashes = Promise.resolve(new Map([["models/ak.glb", fp(data)]]));
    const r = await fetchFpsAsset("/fps/models/ak.glb", hashes);
    expect(new TextDecoder().decode(await r.arrayBuffer())).toBe("rifle");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![1]).toEqual({ cache: "force-cache" });
  });

  it("asks the server when the stored copy is an older deploy's, or is missing", async () => {
    const fresh = body("new rifle");
    const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.cache === "force-cache" ? new Response("old rifle") : new Response(fresh),
    );
    vi.stubGlobal("fetch", fetch);
    const hashes = Promise.resolve(new Map([["models/ak.glb", fp(fresh)]]));
    const r = await fetchFpsAsset("/fps/models/ak.glb", hashes);
    expect(new TextDecoder().decode(await r.arrayBuffer())).toBe("new rifle");
    expect(fetch.mock.calls.map((c) => c[1])).toEqual([
      { cache: "force-cache" },
      { cache: "no-cache" },
    ]);
    // A stored failure is not the server's answer now either.
    fetch.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.cache === "force-cache" ? new Response("", { status: 404 }) : new Response(fresh),
    );
    const again = await fetchFpsAsset("/fps/models/ak.glb", hashes);
    expect(again.ok).toBe(true);
  });

  it("files the deploy does not list are fetched as before", async () => {
    const fetch = vi.fn(async () => new Response("x"));
    vi.stubGlobal("fetch", fetch);
    await fetchFpsAsset("/fps/audio/new.ogg", Promise.resolve(new Map()));
    expect(fetch).toHaveBeenCalledWith("/fps/audio/new.ogg");
    await fetchFpsAsset("/fps/audio/new.ogg", Promise.resolve(null));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("the build lists every file under public/fps except the island's own folder", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fps-hashes-"));
    fs.mkdirSync(path.join(dir, "audio"));
    fs.mkdirSync(path.join(dir, "br"));
    fs.writeFileSync(path.join(dir, "audio", "a.ogg"), "aaa");
    fs.writeFileSync(path.join(dir, "br", "world.json"), "{}");
    fs.writeFileSync(path.join(dir, "skin.webp"), "w");
    fs.writeFileSync(path.join(dir, "NOTES.md"), "n");
    expect(emitFpsAssetHashes(true, dir)).toBe(2);
    const list = JSON.parse(fs.readFileSync(path.join(dir, "asset-hashes.json"), "utf8"));
    expect(Object.keys(list.files).sort()).toEqual(["audio/a.ogg", "skin.webp"]);
    expect(list.files["audio/a.ogg"]).toBe(fp(body("aaa")));
    emitFpsAssetHashes(false, dir);
    expect(fs.existsSync(path.join(dir, "asset-hashes.json"))).toBe(false);
    fs.rmSync(dir, { recursive: true });
  });
});
