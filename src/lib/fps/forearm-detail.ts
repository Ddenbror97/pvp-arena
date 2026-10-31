import * as THREE from "three";

/**
 * Procedural forearm surface detail on the fitted-forearm UVs:
 *   u: around the arm, 0.5 faces the camera (the dorsal/radial side the player sees)
 *   v: along the arm, 0 at the glove cuff, 1 at the elbow.
 * Red = height for bump mapping (veins and tendons raised, muscle separation recessed).
 * Green = superficial-vein mask, used to cool the skin tone over the veins.
 *
 * Anatomy follows what CS/COD viewmodel arms read with at a glance: two or three superficial
 * veins that branch and wander toward the elbow, tendons that are only visible in the flat
 * distal third, and one soft groove where the muscle bellies part in the upper forearm.
 */
export function createForearmDetailTexture(seed = 1337) {
  const W = 512,
    H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const pen = canvas.getContext("2d")!;
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  // Canvas row 0 is the elbow (v = 1) because textures are flipped on upload.
  const at = (u: number, v: number): [number, number] => [u * W, (1 - v) * H];
  // Each feature group is drawn sharp on its own layer, then blurred and composited once:
  // a canvas filter per stroke would cost a full-canvas blur for every segment.
  const layer = (
    blur: number,
    operation: GlobalCompositeOperation,
    draw: (g: CanvasRenderingContext2D) => void,
  ) => {
    const sheet = document.createElement("canvas");
    sheet.width = W;
    sheet.height = H;
    const g = sheet.getContext("2d")!;
    g.lineCap = "round";
    g.lineJoin = "round";
    if (operation === "multiply") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, W, H);
    }
    draw(g);
    pen.globalCompositeOperation = operation;
    pen.filter = blur > 0 ? `blur(${blur}px)` : "none";
    pen.drawImage(sheet, 0, 0);
    pen.filter = "none";
  };

  pen.fillStyle = "rgb(128,0,0)";
  pen.fillRect(0, 0, W, H);

  // Muscle separation: a long soft groove between the extensor and flexor masses.
  layer(16, "multiply", (g) => {
    g.strokeStyle = "rgb(196,255,255)";
    g.lineWidth = 26;
    g.beginPath();
    g.moveTo(...at(0.64, 0.3));
    g.bezierCurveTo(...at(0.62, 0.55), ...at(0.56, 0.75), ...at(0.52, 0.98));
    g.stroke();
  });
  // Flat tendinous wrist: subtle valleys either side of the tendon group.
  layer(8, "multiply", (g) => {
    g.strokeStyle = "rgb(205,255,255)";
    g.lineWidth = 14;
    for (const u of [0.41, 0.6]) {
      g.beginPath();
      g.moveTo(...at(u, 0.02));
      g.lineTo(...at(u + (u < 0.5 ? -0.02 : 0.02), 0.3));
      g.stroke();
    }
  });
  // Tendons fade out as they enter the muscle bellies about a third of the way up.
  layer(5, "lighter", (g) => {
    for (const [u, width] of [
      [0.455, 11],
      [0.505, 8],
      [0.555, 10],
    ] as const) {
      const [x0, y0] = at(u, 0),
        [x1, y1] = at(u + (u - 0.5) * 0.25, 0.36);
      const gradient = g.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, "rgba(46,0,0,1)");
      gradient.addColorStop(0.7, "rgba(30,0,0,0.6)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      g.strokeStyle = gradient;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
  });

  // Superficial veins: meandering, tapering, linked by a diagonal branch.
  type Vein = { u: number; v: number; du: number; v1: number; width: number; strength: number };
  const veins: Vein[] = [
    { u: 0.43, v: 0, du: -0.09, v1: 1.02, width: 6.5, strength: 1 }, // cephalic (thumb side)
    { u: 0.57, v: 0, du: 0.05, v1: 1.02, width: 5.5, strength: 0.9 }, // median / basilic
    { u: 0.6, v: 0.5, du: -0.21, v1: 0.82, width: 4.5, strength: 0.8 }, // median cubital link
    { u: 0.5, v: 0, du: -0.06, v1: 0.24, width: 3.2, strength: 0.6 }, // wrist tributary
    { u: 0.66, v: 0.08, du: -0.08, v1: 0.42, width: 3, strength: 0.55 },
    { u: 0.35, v: 0.15, du: 0.03, v1: 0.52, width: 2.6, strength: 0.45 },
  ];
  const paths = veins.map((vein) => {
    const steps = 48,
      phase = random() * Math.PI * 2,
      wander = 0.008 + random() * 0.01;
    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const k = i / steps,
        v = vein.v + (vein.v1 - vein.v) * k;
      const u =
        vein.u +
        vein.du * THREE.MathUtils.smoothstep(k, 0, 1) +
        Math.sin(phase + k * 9) * wander +
        (random() - 0.5) * 0.003;
      points.push(at(u, v));
    }
    return { vein, points };
  });
  const strokeVeins = (scale: number, rgb: string) => (g: CanvasRenderingContext2D) => {
    for (const { vein, points } of paths)
      for (let i = 1; i < points.length; i++) {
        const k = i / points.length;
        // Veins sink into the skin toward the elbow and at their ends.
        const fade = Math.sin(Math.PI * Math.min(1, k * 1.15)) ** 0.6 * (1 - 0.35 * k);
        g.strokeStyle = `rgba(${rgb},${vein.strength * fade})`;
        g.lineWidth = vein.width * scale * (1 - 0.35 * k);
        g.beginPath();
        g.moveTo(...points[i - 1]!);
        g.lineTo(...points[i]!);
        g.stroke();
      }
  };
  // ~0.43 mm per texel round the arm: a soft 7–9 mm halo with a ~4 mm raised core.
  layer(5, "lighter", strokeVeins(3, "26,150,0"));
  layer(1.8, "lighter", strokeVeins(1.6, "60,150,0"));

  // Fine skin relief so highlights break up like skin rather than plastic.
  layer(0.6, "lighter", (g) => {
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${4 + Math.floor(random() * 7)},0,0,0.7)`;
      g.fillRect(random() * W, random() * H, 1.4, 1.4);
    }
  });
  pen.globalCompositeOperation = "source-over";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** Cool and slightly darken skin over veins; reads the green channel of the bump map. */
export function applyVeinTint(material: THREE.MeshStandardMaterial, strength = 0.5) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
#ifdef USE_BUMPMAP
      float veinMask = texture2D( bumpMap, vBumpMapUv ).g;
      diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.7, 0.78, 0.93 ), veinMask * ${strength.toFixed(3)} );
#endif`,
    );
  };
  material.customProgramCacheKey = () => `forearm-vein-tint-${strength}`;
  return material;
}
