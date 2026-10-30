import * as THREE from "three";

/** A soft flash anchored at the barrel exit, pulsed only by confirmed shots. */
export function createMuzzleFlash() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const pen = canvas.getContext("2d")!;
  const fade = pen.createRadialGradient(64, 64, 0, 64, 64, 60);
  fade.addColorStop(0, "rgba(255,255,239,1)");
  fade.addColorStop(0.14, "rgba(255,238,159,.95)");
  fade.addColorStop(0.38, "rgba(255,157,45,.65)");
  fade.addColorStop(1, "rgba(255,102,20,0)");
  pen.fillStyle = fade;
  pen.beginPath();
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8,
      radius = i % 2 ? 17 : 58;
    const x = 64 + Math.cos(angle) * radius,
      y = 64 + Math.sin(angle) * radius;
    if (i === 0) pen.moveTo(x, y);
    else pen.lineTo(x, y);
  }
  pen.closePath();
  pen.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const root = new THREE.Group();
  root.name = "barrel-flash";
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.085), material);
  const jet = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.125), material);
  jet.rotation.x = Math.PI / 2;
  jet.position.z = -0.04;
  root.add(face, jet);
  root.traverse((object) => object.layers.set(1));
  root.visible = false;
  return {
    root,
    update(remaining: number, barrel: number, y: number, shot: number) {
      root.position.set(0, y, barrel - 0.008);
      root.visible = remaining > 0;
      material.opacity = Math.max(0, Math.min(1, remaining / 28));
      face.rotation.z = shot * 2.39996;
      root.scale.setScalar(0.85 + (shot % 3) * 0.12);
    },
    dispose() {
      texture.dispose();
    },
  };
}
