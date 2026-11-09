import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * Your operator in the inventory's equipment panel, rendered live from the game's own character
 * with what you wear and carry (owner, 2026-11-08: "a player equipped a helmet but the
 * inventory character doesn't show it"). The same studio as the item icons (scripts/br/icons):
 * a soft room environment, a key light high on the left and a cool rim, ACES at the game's
 * exposure, on a transparent background.
 *
 * Drawn with the arena's own renderer into an off-screen float target (no second WebGL
 * context, the character's textures already on the GPU), read back and tone-mapped here, then
 * handed to the page as an image. Only when what it shows changes, while the inventory is open.
 */
export const FIGURE_SIZE = { w: 320, h: 640 } as const;
const EXPOSURE = 1.05;

export function createOperatorFigure(renderer: THREE.WebGLRenderer, character: THREE.Object3D) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();
  room.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  const rim = new THREE.DirectionalLight(0xbcd2ff, 1.4);
  scene.add(key, key.target, rim, rim.target);
  scene.add(new THREE.HemisphereLight(0xf2f4ff, 0x30302a, 0.6));
  scene.add(character);
  // The officer stands at the origin facing −z; the camera looks at him from the front and a
  // little to his left, as the panel's old picture did.
  const camera = new THREE.PerspectiveCamera(18, FIGURE_SIZE.w / FIGURE_SIZE.h, 0.1, 40);
  const dir = new THREE.Vector3(0.75, 0.06, -1).normalize();
  const centre = new THREE.Vector3(0, 0.98, 0);
  // Framed for the tallest he gets (a level 3 helmet) so nothing jumps as gear changes.
  const halfHeight = 1.08;
  const dist = halfHeight / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.copy(centre).addScaledVector(dir, dist);
  camera.lookAt(centre);
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  key.position
    .copy(centre)
    .addScaledVector(dir, 2)
    .addScaledVector(right, -1.5)
    .add(new THREE.Vector3(0, 2.5, 0));
  key.target.position.copy(centre);
  rim.position
    .copy(centre)
    .addScaledVector(dir, -2)
    .addScaledVector(right, 1.2)
    .add(new THREE.Vector3(0, 1.2, 0));
  rim.target.position.copy(centre);
  scene.updateMatrixWorld(true);

  const target = new THREE.WebGLRenderTarget(FIGURE_SIZE.w, FIGURE_SIZE.h, {
    type: THREE.FloatType,
    samples: 4,
  });
  const pixels = new Float32Array(FIGURE_SIZE.w * FIGURE_SIZE.h * 4);
  const canvas = document.createElement("canvas");
  canvas.width = FIGURE_SIZE.w;
  canvas.height = FIGURE_SIZE.h;
  const ctx = canvas.getContext("2d");
  const image = ctx?.createImageData(FIGURE_SIZE.w, FIGURE_SIZE.h) ?? null;
  const clear = new THREE.Color();

  /** Draw into the off-screen target with this renderer's state restored afterwards. */
  function draw(compileOnly: boolean) {
    const previous = renderer.getRenderTarget();
    const alpha = renderer.getClearAlpha();
    renderer.getClearColor(clear);
    const autoClear = renderer.autoClear;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    if (compileOnly) {
      const done = renderer.compileAsync(scene, camera);
      renderer.setRenderTarget(previous);
      renderer.setClearColor(clear, alpha);
      renderer.autoClear = autoClear;
      return done;
    }
    renderer.render(scene, camera);
    renderer.setRenderTarget(previous);
    renderer.setClearColor(clear, alpha);
    renderer.autoClear = autoClear;
    return null;
  }

  return {
    /** Compile the figure's shaders ahead (they differ from the screen's: an off-screen target). */
    prepare() {
      return draw(true) ?? Promise.resolve();
    },
    /** Render the character as it is posed now; a PNG data URL, or null if unavailable. */
    render(): string | null {
      if (!ctx || !image) return null;
      draw(false);
      renderer.readRenderTargetPixels(target, 0, 0, FIGURE_SIZE.w, FIGURE_SIZE.h, pixels);
      const out = image.data,
        { w, h } = FIGURE_SIZE;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          // WebGL rows run bottom-up.
          const i = ((h - 1 - y) * w + x) * 4,
            o = (y * w + x) * 4;
          const a = pixels[i + 3]!;
          if (a <= 0.002) {
            out[o + 3] = 0;
            continue;
          }
          // The target holds linear light, premultiplied at the antialiased edges.
          aces(pixels[i]! / a, pixels[i + 1]! / a, pixels[i + 2]! / a, out, o);
          out[o + 3] = Math.round(Math.min(1, a) * 255);
        }
      ctx.putImageData(image, 0, 0);
      return canvas.toDataURL("image/png");
    },
    dispose() {
      scene.remove(character);
      target.dispose();
      environment.dispose();
    },
  };
}

/** three.js's ACES filmic tone mapping at the game's exposure, then sRGB encoding (0–255). */
function aces(r: number, g: number, b: number, out: Uint8ClampedArray, o: number) {
  const e = EXPOSURE / 0.6;
  r *= e;
  g *= e;
  b *= e;
  // ACES input matrix (sRGB → AP1-ish), as three's shader chunk.
  const ir = 0.59719 * r + 0.35458 * g + 0.04823 * b,
    ig = 0.076 * r + 0.90834 * g + 0.01566 * b,
    ib = 0.0284 * r + 0.13383 * g + 0.83777 * b;
  const fit = (v: number) =>
    (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  const fr = fit(ir),
    fg = fit(ig),
    fb = fit(ib);
  const or = 1.60475 * fr - 0.53108 * fg - 0.07367 * fb,
    og = -0.10208 * fr + 1.10813 * fg - 0.00605 * fb,
    ob = -0.00327 * fr - 0.07276 * fg + 1.07602 * fb;
  out[o] = srgb(or);
  out[o + 1] = srgb(og);
  out[o + 2] = srgb(ob);
}
function srgb(v: number) {
  const c = Math.min(1, Math.max(0, v));
  return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
}
