import { describe, expect, it, vi } from "vitest";
import { Bone, Group, Scene, Vector3 } from "three";
import { updateSceneRoots } from "../src/lib/fps/br/scene-transforms";

describe("BR scene transform ownership", () => {
  it("keeps the loaded island composed while refreshing moving roots", () => {
    const scene = new Scene(),
      island = new Group(),
      player = new Group(),
      hand = new Group();
    island.position.x = 100;
    player.add(hand);
    hand.position.x = 2;
    scene.add(island, player);
    scene.updateMatrixWorld(true);
    scene.matrixWorldAutoUpdate = false;
    const islandUpdate = vi.spyOn(island, "updateMatrixWorld");
    player.position.x = 9;
    updateSceneRoots(scene, island);
    expect(islandUpdate).not.toHaveBeenCalled();
    expect(new Vector3().setFromMatrixPosition(hand.matrixWorld).x).toBe(11);
    expect(new Vector3().setFromMatrixPosition(island.matrixWorld).x).toBe(100);
  });
  it("refreshes a pooled actor on reveal and includes invisible bones within it", () => {
    const scene = new Scene(),
      actor = new Group(),
      bone = new Bone();
    actor.add(bone);
    scene.add(actor);
    scene.updateMatrixWorld(true);
    scene.matrixWorldAutoUpdate = false;
    actor.visible = false;
    const update = vi.spyOn(actor, "updateMatrixWorld");
    actor.position.x = 10;
    bone.position.y = 3;
    bone.visible = false;
    updateSceneRoots(scene, null);
    expect(update).not.toHaveBeenCalled();
    actor.visible = true;
    updateSceneRoots(scene, null);
    expect(new Vector3().setFromMatrixPosition(bone.matrixWorld).toArray()).toEqual([10, 3, 0]);
  });
});
