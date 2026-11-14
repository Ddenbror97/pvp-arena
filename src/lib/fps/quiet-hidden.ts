import type { Object3D } from "three";

/**
 * Stop refreshing an object's subtree while the object is hidden (performance audit
 * 2026-11-14).
 *
 * three.js recomputes the world matrix of everything under an object whenever its parent is
 * refreshed, hidden or not. An operator carries every gun it can hold (seven, each some forty
 * objects with its parts and markers) and its grenades, all but one of them hidden: of an
 * officer's 395 objects 92 can be seen. The character's update refreshes its tree several times
 * a frame (after the stride, the stance, the arms), and the scene once more before drawing, so
 * with sixteen operators near, three quarters of the frame's matrix work, half of the frame's
 * script time, went into guns nobody was holding.
 *
 * While `object.visible` is false, a refresh that reaches it from its parent stops there. The
 * first refresh after it is shown again recomputes its whole subtree (`matrixWorldNeedsUpdate`
 * is left set, and an auto-updating object recomposes anyway). What still goes through while
 * hidden: `updateWorldMatrix(true, …)`, which is always a caller asking for this object itself
 * (three's own walk down from a parent passes `false, true`): `getWorldPosition`,
 * `localToWorld`, and code that measures a hidden model once after loading.
 *
 * Only for subtrees nobody reads the world matrices of while they are hidden, other than
 * through those calls.
 */
export function quietWhileHidden<T extends Object3D>(object: T): T {
  const refreshDown = object.updateMatrixWorld,
    refresh = object.updateWorldMatrix;
  object.updateMatrixWorld = function (this: Object3D, force?: boolean) {
    if (this.visible) refreshDown.call(this, force);
    else this.matrixWorldNeedsUpdate = true;
  };
  object.updateWorldMatrix = function (
    this: Object3D,
    updateParents: boolean,
    updateChildren: boolean,
  ) {
    if (this.visible || updateParents || !updateChildren)
      refresh.call(this, updateParents, updateChildren);
    else this.matrixWorldNeedsUpdate = true;
  };
  return object;
}
