import { afterEach, it, expect, vi } from "vitest";
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Texture } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { retainAuthoredAsset } from "../src/lib/fps/authored-assets";

afterEach(() => vi.restoreAllMocks());
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
