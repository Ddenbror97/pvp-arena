import * as THREE from "three";
import { expect, it } from "vitest";
import {
  BACKDROP_MATERIAL,
  FOLIAGE_ORDER,
  prepareBackdrop,
  prepareFoliage,
} from "../src/lib/fps/maps/lost-trail-environment";

it("foliage draws after the solids, the near forest before the background", () => {
  const root = new THREE.Group();
  const leaves = () => new THREE.MeshStandardMaterial({ alphaTest: 0.5 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const edgeCrown = new THREE.Mesh(new THREE.BoxGeometry(), [
    new THREE.MeshStandardMaterial(),
    leaves(),
  ]);
  const farCrown = new THREE.Mesh(new THREE.BoxGeometry(), leaves());
  const bg = Object.assign(new THREE.Group(), { name: "section-bg-es" });
  const veg = Object.assign(new THREE.Group(), { name: "section-veg-es" });
  bg.add(Object.assign(new THREE.Group(), { name: "section-bg-es-lib-tree" }).add(farCrown));
  veg.add(edgeCrown);
  root.add(wall, veg, bg);
  prepareFoliage(root);
  expect(wall.renderOrder).toBe(0);
  expect(edgeCrown.renderOrder).toBe(FOLIAGE_ORDER.near);
  expect(farCrown.renderOrder).toBe(FOLIAGE_ORDER.background);
  expect(FOLIAGE_ORDER.background).toBeGreaterThan(FOLIAGE_ORDER.near);
  expect((farCrown.material as THREE.Material).alphaToCoverage).toBe(true);
});

it("the baked forest backdrop is drawn unlit and as-is, with the solids, and never as foliage", () => {
  const root = new THREE.Group();
  const image = new THREE.Texture();
  const baked = new THREE.MeshStandardMaterial({
    name: BACKDROP_MATERIAL,
    map: image,
    alphaTest: 0.5,
  });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(), baked);
  wall.castShadow = true;
  root.add(wall);
  const owned = prepareBackdrop(root);
  prepareFoliage(root);
  expect(owned).toHaveLength(1);
  const material = wall.material as THREE.MeshBasicMaterial;
  expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
  expect(material.map).toBe(image);
  expect(material.alphaTest).toBe(0.5);
  expect(material.toneMapped).toBe(false);
  expect(material.fog).toBe(false);
  // Not treated as foliage: no wind, no alpha-to-coverage, drawn with the solids, no shadow.
  expect(material.alphaToCoverage).toBe(false);
  expect(material.onBeforeCompile.toString()).not.toContain("windTime");
  expect(wall.renderOrder).toBe(0);
  expect(wall.castShadow).toBe(false);
});
