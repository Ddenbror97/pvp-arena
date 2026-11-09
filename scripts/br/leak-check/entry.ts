/**
 * Mount / dispose the real BR arena repeatedly and report what the renderer still tracks after
 * each teardown (scripts/br/leak-check/capture.mjs drives this; see that file).
 *
 * The harness snapshots, between "mounted and rendered" and "dispose", every Texture the
 * renderer has uploaded (a heap query), so the teardown's disposals can be checked against
 * that set: whatever was uploaded and never disposed is named in the report.
 */
import * as THREE from "three";
import { createBrArena } from "../../../src/lib/fps/br/br-arena";
import { retainedAuthoredAssets } from "../../../src/lib/fps/authored-assets";

const base = location.origin + "/";
const host = document.createElement("div");
host.style.cssText = "position:fixed;inset:0";
document.body.append(host);

let renderer: THREE.WebGLRenderer | null = null;
/** Textures the renderer had uploaded before the teardown, and those the teardown disposed. */
const uploadedBefore = new Set<THREE.Texture>();
const disposed = new WeakSet<THREE.Texture>();
{
  const proto = THREE.Texture.prototype;
  const dispose = proto.dispose;
  proto.dispose = function (this: THREE.Texture) {
    disposed.add(this);
    return dispose.call(this);
  };
}
/** Describe a live Texture for the report. */
function describe(t: THREE.Texture) {
  let img: { width?: number; height?: number; src?: string; currentSrc?: string } | undefined;
  try {
    img = t.image;
  } catch {
    img = undefined;
  }
  const src = img?.src ?? img?.currentSrc ?? "";
  return `${t.constructor.name} ${t.name || "(unnamed)"} ${img?.width ?? "?"}x${img?.height ?? "?"}${src ? " " + src.replace(location.origin, "").slice(0, 80) : ""}`;
}

/** Materials (by name) that reference each texture, found by walking the arena's scene. */
const owners = new Map<THREE.Texture, Set<string>>();
let scene: THREE.Scene | null = null;
/** Called by the harness with every live Texture: keep the ones the renderer has uploaded. */
function snapshotUploaded(textures: Iterable<THREE.Texture>) {
  uploadedBefore.clear();
  owners.clear();
  if (!renderer) return 0;
  for (const t of textures) {
    const p = renderer.properties.get(t) as { __webglTexture?: unknown } | undefined;
    if (p?.__webglTexture) uploadedBefore.add(t);
  }
  scene?.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    for (const mat of Array.isArray(m) ? m : [m])
      for (const v of Object.values(mat))
        if (v instanceof THREE.Texture)
          (owners.get(v) ?? owners.set(v, new Set()).get(v)!).add(
            `${o.name || o.type}/${mat.name || mat.type}`,
          );
  });
  return uploadedBefore.size;
}
function notDisposed() {
  const c: Record<string, number> = {};
  for (const t of uploadedBefore)
    if (!disposed.has(t)) {
      const k =
        describe(t) +
        "  on " +
        [...(owners.get(t) ?? ["(no scene material)"])].slice(0, 3).join(",");
      c[k] = (c[k] ?? 0) + 1;
    }
  return c;
}

declare global {
  interface Window {
    __snapshot?: () => Promise<number>;
  }
}

async function cycle() {
  const arena = createBrArena(host, base, () => {});
  await arena.ready;
  // One rendered frame, so every subsystem has uploaded what it will upload.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const before = arena.debug();
  renderer = before.renderer as THREE.WebGLRenderer;
  scene = (before as unknown as { scene?: THREE.Scene }).scene ?? null;
  // (disposed is a WeakSet: entries from earlier cycles are unreachable once their textures are.)
  const uploaded = (await window.__snapshot?.()) ?? -1;
  const left = arena.dispose();
  // three's own floor for this renderer's features: an empty shadowed scene plus one MSAA
  // float render target and a PMREM environment, disposed the same way.
  const probe = new THREE.WebGLRenderer({ canvas: document.createElement("canvas") });
  probe.shadowMap.enabled = true;
  const ps = new THREE.Scene();
  const light = new THREE.DirectionalLight();
  light.castShadow = true;
  ps.add(light, new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  probe.render(ps, new THREE.PerspectiveCamera());
  const rt = new THREE.WebGLRenderTarget(320, 640, { type: THREE.FloatType, samples: 4 });
  probe.setRenderTarget(rt);
  probe.render(ps, new THREE.PerspectiveCamera());
  probe.setRenderTarget(null);
  const pm = new THREE.PMREMGenerator(probe);
  const env = pm.fromScene(new THREE.Scene(), 0.04).texture;
  pm.dispose();
  rt.dispose();
  env.dispose();
  light.shadow.map?.dispose();
  const floor = { ...probe.info.memory };
  probe.dispose();
  const result = {
    floor,
    geometries: before.geometries,
    textures: before.textures,
    uploaded,
    left,
    retained: retainedAuthoredAssets(),
    notDisposed: notDisposed(),
  };
  forget();
  return result;
}
// (The harness's own bookkeeping must not keep the arena alive between cycles.)
function forget() {
  uploadedBefore.clear();
  owners.clear();
  renderer = null;
  scene = null;
}

Object.assign(window, {
  leak: {
    THREE,
    snapshotUploaded,
    run: async (cycles: number) => {
      const out = [];
      for (let i = 0; i < cycles; i++) {
        out.push(await cycle());
        // Let the browser reclaim between cycles (ImageBitmaps, GL objects); the renderer is gone.
        await new Promise((r) => setTimeout(r, 1500));
      }
      return out;
    },
    /** JS heap in use, for the growth check across cycles. */
    heap: () =>
      (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ??
      -1,
  },
});
