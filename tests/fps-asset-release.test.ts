import { afterEach, it, expect, vi } from "vitest";
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Texture } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { retainAuthoredAsset } from "../src/lib/fps/authored-assets";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const model = () => {
  const scene = new Group(),
    texture = new Texture(),
    disposed = vi.fn();
  texture.addEventListener("dispose", disposed);
  scene.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: texture })));
  return { source: { scene } as unknown as GLTF, disposed };
};

it("releases loaded source textures synchronously on the final owner, before renderer teardown", async () => {
  const { source, disposed } = model();
  vi.spyOn(GLTFLoader.prototype, "loadAsync").mockResolvedValue(source);
  const a = retainAuthoredAsset("/release-test-loaded.glb"),
    b = retainAuthoredAsset("/release-test-loaded.glb");
  await Promise.all([a.ready, b.ready]);
  a.release();
  expect(disposed).not.toHaveBeenCalled();
  b.release();
  expect(disposed).toHaveBeenCalledTimes(1); // No microtask may intervene first.
  b.release();
  expect(disposed).toHaveBeenCalledTimes(1);
});

it("still disposes a source once when the last owner leaves before loading finishes", async () => {
  const { source, disposed } = model();
  let complete!: (source: GLTF) => void;
  vi.spyOn(GLTFLoader.prototype, "loadAsync").mockReturnValue(
    new Promise<GLTF>((resolve) => {
      complete = resolve;
    }),
  );
  const lease = retainAuthoredAsset("/release-test-pending.glb");
  lease.release();
  expect(disposed).not.toHaveBeenCalled();
  complete(source);
  await lease.ready;
  await Promise.resolve();
  expect(disposed).toHaveBeenCalledTimes(1);
});

it("releases the shared pack's off-scene textures synchronously before renderer teardown", async () => {
  const texture = new Texture();
  const disposed = vi.fn();
  texture.addEventListener("dispose", disposed);
  const material = new MeshStandardMaterial({ map: texture });
  const source = {
    scene: new Group(),
    parser: { json: { materials: [{}] }, getDependency: vi.fn().mockResolvedValue(material) },
  } as unknown as GLTF;
  vi.spyOn(GLTFLoader.prototype, "loadAsync").mockResolvedValue(source);
  const a = retainAuthoredAsset("/fps/models/viewmodel-shared.glb");
  const b = retainAuthoredAsset("/fps/models/viewmodel-shared.glb");
  await Promise.all([a.ready, b.ready]);
  a.release();
  expect(disposed).not.toHaveBeenCalled();
  b.release();
  expect(disposed).toHaveBeenCalledTimes(1);
});

it.each(["loaded", "failed"] as const)(
  "releases a late shared-pack lease when its last owner has left (%s)",
  async (result) => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          "pending-weapon": { arms: { baseColorTexture: "shared-skin" } },
        }),
      }),
    );
    const { retainAuthoredAsset, retainedAuthoredAssets } =
      await import("../src/lib/fps/authored-assets");
    const weapon = model();
    (weapon.source.scene.children[0] as Mesh).material = new MeshStandardMaterial({
      name: "arms",
      map: new Texture(),
    });
    const texture = new Texture(),
      disposed = vi.fn();
    texture.addEventListener("dispose", disposed);
    const material = new MeshStandardMaterial({ name: "shared-skin", map: texture });
    const pack = {
      scene: new Group(),
      parser: { json: { materials: [{}] }, getDependency: vi.fn().mockResolvedValue(material) },
    } as unknown as GLTF;
    let finish!: (g: GLTF) => void;
    vi.spyOn(GLTFLoader.prototype, "loadAsync").mockImplementation((url) =>
      url.includes("viewmodel-shared")
        ? result === "loaded"
          ? Promise.resolve(pack)
          : Promise.reject(new Error("pack download failed"))
        : new Promise((resolve) => {
            finish = resolve;
          }),
    );
    const lease = retainAuthoredAsset("/pending-weapon.glb");
    lease.release();
    finish(weapon.source);
    if (result === "loaded") await lease.ready;
    else await expect(lease.ready).rejects.toThrow("pack download failed");
    await Promise.resolve();
    expect(retainedAuthoredAssets()).toEqual([]);
    expect(disposed).toHaveBeenCalledTimes(result === "loaded" ? 1 : 0);
  },
);
