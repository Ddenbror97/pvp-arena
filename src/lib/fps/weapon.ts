import * as THREE from "three";
export const AK_MUZZLE = { x: 0, y: 0.018, z: -0.556 } as const;

/** A real, volumetric AK-shaped mesh with the supplied side artwork projected onto its furniture. */
export function createWeaponKit() {
  let disposed = false;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 4;
  const pen = canvas.getContext("2d")!;
  pen.fillStyle = "#44265c";
  pen.fillRect(0, 0, 4, 4);
  const skin: THREE.Texture = new THREE.CanvasTexture(canvas);
  skin.colorSpace = THREE.SRGBColorSpace;
  skin.anisotropy = 8;
  const painted = new THREE.MeshStandardMaterial({ map: skin, metalness: 0.35, roughness: 0.38 });
  const artwork = new THREE.TextureLoader().load(
    "/fps/rifle-reference.png",
    (image) => {
      if (!disposed) {
        painted.map = image;
        painted.needsUpdate = true;
      }
    },
    undefined,
    () => console.warn("FPS rifle artwork unavailable; retaining the material fallback."),
  );
  artwork.colorSpace = THREE.SRGBColorSpace;
  artwork.anisotropy = 8;
  const steel = new THREE.MeshStandardMaterial({
    color: 0x24232a,
    metalness: 0.72,
    roughness: 0.32,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111016, roughness: 0.83 });
  const scale = 0.0005;
  const point = (x: number, y: number) => new THREE.Vector2((x - 1100) * scale, (300 - y) * scale);
  const shape = (coords: number[][]) => new THREE.Shape(coords.map((p) => point(p[0]!, p[1]!)));
  function rifle() {
    const root = new THREE.Group();
    root.name = "pvp-ak47";
    const part = (name: string, coords: number[][], depth: number, holes: number[][][] = []) => {
      const outline = shape(coords);
      for (const hole of holes)
        outline.holes.push(new THREE.Path(hole.map((p) => point(p[0]!, p[1]!))));
      const geometry = new THREE.ExtrudeGeometry(outline, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.0015,
        bevelThickness: 0.0015,
        curveSegments: 8,
      });
      geometry.rotateY(-Math.PI / 2);
      geometry.translate(depth / 2, 0, 0);
      const positions = geometry.getAttribute("position"),
        uv = geometry.getAttribute("uv");
      for (let i = 0; i < positions.count; i++)
        uv.setXY(
          i,
          (positions.getZ(i) / scale + 1100) / 2000,
          1 - (300 - positions.getY(i) / scale) / 800,
        );
      const mesh = new THREE.Mesh(geometry, [painted, steel]);
      mesh.name = name;
      mesh.castShadow = true;
      root.add(mesh);
      return mesh;
    };
    part(
      "receiver",
      [
        [847, 180],
        [1287, 174],
        [1362, 207],
        [1410, 273],
        [1408, 359],
        [1154, 365],
        [1022, 350],
        [872, 329],
      ],
      0.071,
    );
    part(
      "handguard",
      [
        [299, 192],
        [424, 169],
        [672, 160],
        [821, 182],
        [855, 217],
        [849, 327],
        [804, 344],
        [568, 319],
        [346, 294],
        [301, 269],
      ],
      0.065,
    );
    part(
      "stock",
      [
        [1400, 273],
        [1480, 302],
        [1665, 295],
        [1925, 312],
        [1983, 337],
        [1980, 606],
        [1913, 628],
        [1764, 558],
        [1555, 430],
        [1411, 367],
      ],
      0.068,
    );
    part(
      "curved-magazine",
      [
        [1055, 351],
        [1023, 453],
        [970, 576],
        [885, 680],
        [760, 747],
        [713, 706],
        [805, 612],
        [858, 512],
        [890, 421],
        [901, 341],
      ],
      0.047,
    );
    part(
      "pistol-grip",
      [
        [1291, 360],
        [1377, 364],
        [1388, 468],
        [1421, 592],
        [1378, 618],
        [1289, 602],
        [1275, 549],
      ],
      0.046,
    );
    part(
      "trigger-guard",
      [
        [1116, 361],
        [1284, 366],
        [1280, 410],
        [1247, 434],
        [1150, 429],
        [1117, 406],
      ],
      0.016,
      [
        [
          [1142, 372],
          [1257, 376],
          [1253, 398],
          [1235, 414],
          [1158, 409],
          [1142, 397],
        ],
      ],
    );
    part(
      "front-sight",
      [
        [76, 242],
        [77, 145],
        [92, 118],
        [121, 120],
        [133, 147],
        [136, 242],
      ],
      0.025,
      [
        [
          [96, 144],
          [115, 144],
          [121, 172],
          [110, 180],
          [96, 169],
        ],
        [
          [93, 199],
          [116, 199],
          [122, 224],
          [93, 224],
        ],
      ],
    );
    const cylinder = (
      radius: number,
      length: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material = steel,
    ) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16), material);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      root.add(mesh);
      return mesh;
    };
    cylinder(0.012, 0.37, 0, 0.018, -0.355);
    cylinder(0.017, 0.042, 0, 0.018, -0.534);
    cylinder(0.011, 0.23, 0, 0.06, -0.235);
    // Rolled steel dust cover and ribs break up the flat side-art extrusion in POV.
    cylinder(0.034, 0.245, 0, 0.027, 0.025);
    for (const z of [-0.065, -0.035, -0.005, 0.025, 0.055, 0.085]) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.0345, 0.0012, 4, 16, Math.PI), steel);
      rib.position.set(0, 0.027, z);
      root.add(rib);
    }
    const selector = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.007, 0.08), steel);
    selector.position.set(0.038, -0.018, 0.05);
    selector.rotation.x = 0.15;
    root.add(selector);
    const muzzleHole = new THREE.Mesh(new THREE.CircleGeometry(0.01, 16), rubber);
    muzzleHole.rotation.y = Math.PI;
    muzzleHole.position.set(0, 0.018, -0.556);
    root.add(muzzleHole);
    for (const z of [-0.11, -0.03, 0.06, 0.11])
      for (const side of [-1, 1]) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 6, 4), steel);
        rivet.scale.x = 0.4;
        rivet.position.set(side * 0.037, -0.01, z);
        root.add(rivet);
      }
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.009, 0.018), steel);
    bolt.name = "charging-handle";
    bolt.position.set(0.046, 0.02, -0.04);
    root.add(bolt);
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.009, 0.025), steel);
    rearSight.position.set(0, 0.071, -0.115);
    root.add(rearSight);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.014), steel);
      ear.position.set(side * 0.012, 0.08, -0.115);
      root.add(ear);
    }
    return root;
  }
  return {
    rifle,
    dispose() {
      disposed = true;
      skin.dispose();
      artwork.dispose();
    },
  };
}
export type WeaponKit = ReturnType<typeof createWeaponKit>;
