import * as THREE from "three";
import { createGrenadeWorldView } from "../../../src/lib/fps/grenades/grenade-world-view";
import { SANDGATE } from "../../../src/lib/fps/bomb/sandgate";
import { GRENADE_TYPES, type ThrowKind } from "../../../src/lib/fps/grenades/rules";
import type { Projectile } from "../../../src/lib/fps/grenades/world";

/** Real pooled grenade meshes: release prediction → delayed event / snapshot confirmation. */
export async function checkGrenadeHandoffs() {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera();
  const world = createGrenadeWorldView(scene, SANDGATE);
  await world.ready;
  const root = scene.getObjectByName("grenades-world")!;
  const active = (type: string) =>
    root.children.filter((o) => o.name === `GR_${type}` && o.position.y > -100);
  const check = (ok: boolean, why: string) => {
    if (!ok) throw new Error(why);
  };
  const cases: object[] = [];
  for (const type of GRENADE_TYPES)
    for (const kind of ["over", "medium", "under"] as ThrowKind[])
      for (const delay of [66, 150, 300])
        for (const snapshotFirst of [false, true]) {
          world.reset();
          const speed = kind === "over" ? 17 : kind === "medium" ? 11 : 5;
          const local: Projectile = {
            id: -1,
            type,
            kind,
            owner: -1,
            at: 1000,
            o: [0, 20, 0],
            v: [0, 2, -speed],
          };
          const fromHand = new THREE.Vector3(0.2, 19.7, 0.1);
          world.predict(local, fromHand);
          for (let ms = 0; ms < delay; ms += 16)
            world.update(1000 + ms, undefined, camera, 0.016, 0);
          const object = active(type)[0]!;
          check(!!object, `${type}: missing prediction`);
          const before = object.position.clone();
          const server: Projectile = { ...local, id: 1, owner: 0, at: 1000 + delay - 15 };
          const publicWorld = { flying: [server], smokes: [], fires: [] };
          if (!snapshotFirst) world.adopt(server, true, 1000 + delay);
          world.update(1000 + delay, publicWorld, camera, 0, 0);
          check(active(type).length === 1, `${type}/${kind}: duplicate flight after confirmation`);
          check(
            object.position.distanceTo(before) < 0.001,
            `${type}/${kind}: pullback at handoff (${object.position.distanceTo(before).toFixed(3)} m)`,
          );
          let backwards = 0;
          for (let ms = 16; ms <= 500; ms += 16) {
            const z = object.position.z;
            world.update(1000 + delay + ms, publicWorld, camera, 0.016, 0);
            backwards = Math.max(backwards, object.position.z - z);
          }
          check(
            backwards < 0.001,
            `${type}/${kind}: correction reverses flight by ${backwards.toFixed(3)} m`,
          );
          world.adopt(server, true, 1000 + delay + 500);
          check(active(type).length === 1, `${type}: late event duplicates snapshot flight`);
          cases.push({
            type,
            kind,
            delay,
            snapshotFirst,
            handoffJump: object.position.distanceTo(before),
            backwards,
          });
        }
  // Low-latency snapshots may confirm one input tick before local presentation catches up.
  for (const type of GRENADE_TYPES) {
    world.reset();
    const p: Projectile = {
      id: 2,
      type,
      kind: "over",
      owner: 0,
      at: 1000,
      o: [0, 20, 0],
      v: [0, 2, -17],
    };
    const data = { flying: [p], smokes: [], fires: [] };
    world.update(1010, data, camera, 0.016, 0);
    world.predict({ ...p, id: -1, owner: -1, at: 1020 }, new THREE.Vector3(0, 20, 0));
    world.update(1030, data, camera, 0.016, 0);
    check(active(type).length === 1, `${type}: early confirmation duplicates predicted release`);
  }
  world.dispose();
  return {
    cases: cases.length,
    earlyConfirmations: GRENADE_TYPES.length,
    noHandoffSnaps: true,
    noBackwardCorrections: true,
  };
}
