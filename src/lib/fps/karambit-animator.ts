import * as THREE from "three";

/**
 * Karambit animation state machine over the Blender-authored clips (art/blender/karambit).
 *
 * The clips animate a small control rig (KR_Hand, KR_Knife, KR_Fingers, KR_View) in the knife
 * GLB; three's AnimationMixer plays and blends them, and `update` returns the blended controls
 * for the viewmodel to apply to the team's arms. Base states (equip, idle, idle tricks, inspect,
 * slash, stab) cross-fade on one layer; walking, running, strafing and landing are additive
 * layers on top. Purely cosmetic: attacks here are local presentation; the server decides hits.
 */
type KarambitState = "hidden" | "equip" | "idle" | "trick" | "inspect" | "slash" | "stab";
export const KARAMBIT_TRICKS = [
  "karambit_idle_spin",
  "karambit_reverse_grip",
  "karambit_double_flip",
  "karambit_inspect_blade",
  "karambit_freestyle",
] as const;
/** Idle tricks start after this long (seconds) without relevant input, randomised. */
export const TRICK_DELAY = { min: 8, max: 15 } as const;
/**
 * Idle carry stance, as seen in first person: the fist is held low and reaches forward into the
 * scene, palm down, with the back of the hand to the camera and the forearm coming up from the
 * lower right. The karambit's ring sits at the front of the fist (index finger) and the blade
 * leaves the little-finger side, curving up above the sleeve. Applied on top of the idle clip
 * whenever the base state is idle (standing, walking or running). Attacks, inspect, tricks and
 * the equip ease out of it to play from their authored pose.
 *
 * The viewmodel solves the hand rotation from its rig (karambit-viewmodel setCarryStance). The
 * hand axis runs along `arm` and the palm faces `palm`. The forearm turns with the hand, so the
 * glove cuff stays seated in the sleeve. `rotation` is the fallback until a viewmodel has set it
 * (tests). The `__…` globals are preview-tool overrides.
 */
export const KARAMBIT_RUN_POSE = {
  /** Wrist offset (viewmodel metres). */
  position: (globalThis as { __carryPos?: number[] }).__carryPos ?? ([-0.07, -0.06, 0] as const),
  /** Fallback wrist rotation (Euler XYZ, radians). */
  rotation: [1.1, 0.2, 1.3] as const,
  /** Forearm direction toward the hand, camera space (x right, y up, z toward the viewer). */
  arm: (globalThis as { __arm?: number[] }).__arm ?? ([-0.35, 0.35, -1] as const),
  /** Which way the palm faces, camera space (made square to the arm). */
  palm: (globalThis as { __palm?: number[] }).__palm ?? ([0.3, -1, -0.6] as const),
  /** Ease rate (1/s) toward the target weight. */
  rate: 9,
};

export type KarambitControls = {
  handPosition: THREE.Vector3;
  handRotation: THREE.Quaternion;
  knifeRotation: THREE.Quaternion;
  /** 1 = fingers closed on the handle, 0 = open (spins). */
  fingers: number;
  /** Weight of the idle carry stance (0 → 1); the viewmodel lets the forearm follow it. */
  carry: number;
  viewPosition: THREE.Vector3;
  viewRotation: THREE.Quaternion;
};
export type KarambitFrame = {
  /** Seconds since the last update (clamped). */
  dt: number;
  equipped: boolean;
  /** 0 → 1: horizontal speed as a fraction of the run speed. */
  moving: number;
  /** Shift-walk (slow) rather than running. */
  walking: boolean;
  /** Mostly moving backwards. */
  backward: boolean;
  /** -1 (left) → 1 (right). */
  strafe: number;
  airborne: boolean;
  reducedMotion: boolean;
};

type Cue = [number, string];
const BLEND = {
  equipToIdle: 0.15,
  toTrick: 0.3,
  trickToIdle: 0.3,
  toAttack: 0.04,
  attackToIdle: 0.14,
  toInspect: 0.2,
} as const;

export class KarambitAnimator {
  readonly controls: KarambitControls = {
    handPosition: new THREE.Vector3(),
    handRotation: new THREE.Quaternion(),
    knifeRotation: new THREE.Quaternion(),
    fingers: 1,
    carry: 0,
    viewPosition: new THREE.Vector3(),
    viewRotation: new THREE.Quaternion(),
  };
  /** Sound cues from the clips' keyframes (equip, flip, spin, catch, slash, stab, …). */
  onCue: ((name: string, clip: string) => void) | null = null;
  private readonly mixer: THREE.AnimationMixer;
  private readonly base = new Map<string, THREE.AnimationAction>();
  private readonly layers: Record<"walk" | "run" | "land", THREE.AnimationAction | null>;
  private readonly cues: Record<string, Cue[]>;
  private readonly nodes: Record<"hand" | "knife" | "fingers" | "view", THREE.Object3D>;
  private current: THREE.AnimationAction | null = null;
  private currentState: KarambitState = "hidden";
  private equipped = false;
  private idleTime = 0;
  private nextTrickAt: number;
  private lastTrick: string | null = null;
  private trickBag: string[] = [];
  private lastAirborne = false;
  private weights = { walk: 0, run: 0, carry: 0 };
  private strafe = 0;
  private cueTime = 0;
  private readonly scratch = { q: new THREE.Quaternion(), e: new THREE.Euler() };
  private readonly carry = {
    rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(...KARAMBIT_RUN_POSE.rotation)),
    knife: new THREE.Quaternion(),
    position: new THREE.Vector3(...KARAMBIT_RUN_POSE.position),
  };

  constructor(
    private readonly rig: THREE.Object3D,
    clips: THREE.AnimationClip[],
    extras: Record<string, unknown> = {},
    private readonly random: () => number = Math.random,
  ) {
    const node = (name: string) => {
      const found = rig.getObjectByName(name);
      if (!found) throw new Error(`Karambit control ${name} is missing`);
      return found;
    };
    this.nodes = {
      hand: node("KR_Hand"),
      knife: node("KR_Knife"),
      fingers: node("KR_Fingers"),
      view: node("KR_View"),
    };
    this.mixer = new THREE.AnimationMixer(rig);
    const byName = new Map(clips.map((clip) => [clip.name, clip]));
    const reference = byName.get("karambit_unequip") ?? byName.get("karambit_idle")!;
    for (const name of [
      "karambit_equip",
      "karambit_idle",
      "karambit_inspect",
      "karambit_slash",
      "karambit_stab",
      ...KARAMBIT_TRICKS,
    ]) {
      const clip = byName.get(name);
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      if (name === "karambit_idle") action.setLoop(THREE.LoopRepeat, Infinity);
      else {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.base.set(name, action);
    }
    const additive = (name: string, loop: boolean) => {
      const source = byName.get(name);
      if (!source) return null;
      const clip = THREE.AnimationUtils.makeClipAdditive(source.clone(), 0, reference, 30);
      clip.name = `${name}_additive`;
      const action = this.mixer.clipAction(clip);
      action.blendMode = THREE.AdditiveAnimationBlendMode;
      if (loop) action.setLoop(THREE.LoopRepeat, Infinity);
      else {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = false;
      }
      action.setEffectiveWeight(0);
      if (loop) action.play();
      return action;
    };
    this.layers = {
      walk: additive("karambit_walk", true),
      run: additive("karambit_sprint", true),
      land: additive("karambit_land", false),
    };
    let parsed: Record<string, Cue[]> = {};
    try {
      parsed = typeof extras["cues"] === "string" ? JSON.parse(extras["cues"]) : {};
    } catch {
      parsed = {};
    }
    this.cues = parsed;
    this.nextTrickAt = this.trickDelay();
  }

  get state(): KarambitState {
    return this.currentState;
  }

  /** Local presentation of a swing (the server validates and resolves it independently). */
  attack(kind: "slash" | "stab") {
    if (!this.equipped) return;
    this.play(kind === "stab" ? "karambit_stab" : "karambit_slash", BLEND.toAttack, kind);
    this.idleTime = 0;
  }

  /** Manual inspect (F). Ignored while equipping, attacking or already inspecting. */
  inspect() {
    if (!this.equipped || (this.currentState !== "idle" && this.currentState !== "trick")) return;
    this.play("karambit_inspect", BLEND.toInspect, "inspect");
    this.idleTime = 0;
  }

  update(frame: KarambitFrame): KarambitControls {
    const dt = Math.max(0, Math.min(0.1, frame.dt));
    if (frame.equipped !== this.equipped) {
      this.equipped = frame.equipped;
      if (frame.equipped) {
        // Every draw starts clean: no half-finished trick or attack carries over.
        this.mixer.stopAllAction();
        for (const layer of [this.layers.walk, this.layers.run]) {
          layer?.play();
          layer?.setEffectiveWeight(0);
        }
        this.weights.walk = this.weights.run = this.weights.carry = 0;
        this.current = null;
        this.play("karambit_equip", 0, "equip");
      } else {
        this.currentState = "hidden";
        this.current = null;
      }
      this.idleTime = 0;
      this.nextTrickAt = this.trickDelay();
    }
    if (!this.equipped) return this.controls;

    // Base layer transitions.
    const action = this.current,
      finished =
        !!action &&
        action.loop === THREE.LoopOnce &&
        action.time >= action.getClip().duration - 1e-3;
    if (finished && this.currentState !== "idle") {
      const blend =
        this.currentState === "equip"
          ? BLEND.equipToIdle
          : this.currentState === "slash" || this.currentState === "stab"
            ? BLEND.attackToIdle
            : BLEND.trickToIdle;
      this.play("karambit_idle", blend, "idle");
    }
    if (this.currentState === "trick" && frame.moving > 0.2)
      this.play("karambit_idle", BLEND.trickToIdle, "idle");
    // Idle tricks: only standing still, after a randomised quiet spell, never the same twice.
    if (this.currentState === "idle" && frame.moving < 0.05 && !frame.airborne) {
      this.idleTime += dt;
      if (this.idleTime >= this.nextTrickAt) {
        this.play(this.pickTrick(), BLEND.toTrick, "trick");
        this.idleTime = 0;
        this.nextTrickAt = this.trickDelay();
      }
    } else if (this.currentState !== "trick") this.idleTime = 0;

    // Additive movement layers (weights eased toward the real movement).
    const k = 1 - Math.exp(-dt * 10),
      busy = this.currentState === "slash" || this.currentState === "stab" ? 0.4 : 1,
      calm = frame.reducedMotion ? 0.5 : 1;
    const moving = frame.airborne ? 0 : THREE.MathUtils.clamp(frame.moving, 0, 1);
    this.weights.walk += ((frame.walking ? moving : 0) * busy * calm - this.weights.walk) * k;
    this.weights.run += ((frame.walking ? 0 : moving) * busy * calm - this.weights.run) * k;
    if (this.layers.walk) {
      this.layers.walk.setEffectiveWeight(this.weights.walk);
      this.layers.walk.timeScale = frame.backward ? -1 : 1;
    }
    if (this.layers.run) {
      this.layers.run.setEffectiveWeight(this.weights.run);
      this.layers.run.timeScale = frame.backward ? -0.9 : 1;
    }
    if (this.lastAirborne && !frame.airborne && this.layers.land) {
      this.layers.land.reset().setEffectiveWeight(calm).play();
    }
    this.lastAirborne = frame.airborne;
    this.strafe += (frame.strafe * calm - this.strafe) * k;
    // Carry stance: over the plain idle only, so attacks, inspect, tricks and the equip start
    // from their authored pose (it eases out quickly when one begins, back in after).
    const carrying = this.currentState === "idle";
    this.weights.carry +=
      ((carrying ? 1 : 0) - this.weights.carry) *
      (1 - Math.exp(-dt * (carrying ? KARAMBIT_RUN_POSE.rate : KARAMBIT_RUN_POSE.rate * 1.8)));

    const before = this.current?.time ?? 0;
    this.mixer.update(dt);
    this.fireCues(before);

    // Read the blended control rig.
    const c = this.controls;
    c.handPosition.copy(this.nodes.hand.position);
    c.handRotation.copy(this.nodes.hand.quaternion);
    // Strafing leans the wrist into the side step (procedural; one clip covers both sides).
    if (Math.abs(this.strafe) > 1e-4) {
      c.handPosition.x += this.strafe * 0.01;
      c.handRotation.multiply(
        this.scratch.q.setFromEuler(this.scratch.e.set(0, 0, -this.strafe * 0.06)),
      );
    }
    c.knifeRotation.copy(this.nodes.knife.quaternion);
    this.applyRunPose(c, this.weights.carry);
    c.carry = this.weights.carry;
    c.fingers = this.nodes.fingers.position.x;
    const view = frame.reducedMotion ? 0.25 : 1;
    c.viewPosition.copy(this.nodes.view.position).multiplyScalar(view);
    c.viewRotation.identity().slerp(this.nodes.view.quaternion, view);
    return c;
  }

  /** Jump the current base clip to `seconds` (previews and tests). */
  seek(clip: string, seconds: number) {
    const action = this.base.get(clip);
    if (!action) return;
    this.mixer.stopAllAction();
    this.equipped = true;
    this.current = action;
    this.currentState = clip === "karambit_idle" ? "idle" : "trick";
    action.reset().play();
    action.time = seconds;
    this.mixer.update(0);
    const c = this.controls;
    c.handPosition.copy(this.nodes.hand.position);
    c.handRotation.copy(this.nodes.hand.quaternion);
    c.knifeRotation.copy(this.nodes.knife.quaternion);
    c.fingers = this.nodes.fingers.position.x;
    c.viewPosition.copy(this.nodes.view.position);
    c.viewRotation.copy(this.nodes.view.quaternion);
    return c;
  }

  /** Blend the running carry pose onto `controls` (0 = idle, 1 = full carry). */
  applyRunPose(controls: KarambitControls, weight: number) {
    const w = THREE.MathUtils.clamp(weight, 0, 1);
    if (w <= 1e-4) return controls;
    const smooth = w * w * (3 - 2 * w);
    controls.carry = w;
    controls.handPosition.addScaledVector(this.carry.position, smooth);
    controls.handRotation.multiply(this.scratch.q.identity().slerp(this.carry.rotation, smooth));
    controls.knifeRotation.multiply(this.scratch.q.identity().slerp(this.carry.knife, smooth));
    return controls;
  }

  /**
   * The idle clip's first-frame wrist and knife rotations, read from its tracks (no playback,
   * no state change): the base the carry stance is solved on top of.
   */
  idleRest() {
    const clip = this.base.get("karambit_idle")?.getClip();
    const sample = (node: THREE.Object3D) => {
      const track = clip?.tracks.find((t) => t.name === `${node.name}.quaternion`);
      const out = new THREE.Quaternion();
      if (track) out.fromArray(track.values, 0);
      else out.copy(node.quaternion);
      return out;
    };
    return { hand: sample(this.nodes.hand), knife: sample(this.nodes.knife) };
  }

  /** Set the running carry's wrist rotation (solved by the viewmodel from the fist fit). */
  setRunRotation(rotation: THREE.Quaternion) {
    this.carry.rotation.copy(rotation);
  }

  /** Current running-carry weight (0 → 1). */
  get runPose() {
    return this.weights.carry;
  }

  clipNames() {
    return [...this.base.keys()];
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.rig);
  }

  private play(name: string, fade: number, state: KarambitState) {
    const next = this.base.get(name);
    if (!next) return;
    next.reset();
    next.setEffectiveWeight(1);
    next.play();
    if (this.current && this.current !== next && fade > 0)
      this.current.crossFadeTo(next, fade, false);
    else if (this.current && this.current !== next) this.current.stop();
    this.current = next;
    this.currentState = state;
    this.cueTime = 0;
  }

  private fireCues(before: number) {
    const action = this.current;
    if (!action || !this.onCue) return;
    const name = action.getClip().name,
      cues = this.cues[name];
    if (!cues?.length) return;
    const after = action.time;
    const from = Math.max(this.cueTime, before);
    for (const [at, sound] of cues) if (at >= from && at < after) this.onCue(sound, name);
    this.cueTime = after;
  }

  private trickDelay() {
    return TRICK_DELAY.min + this.random() * (TRICK_DELAY.max - TRICK_DELAY.min);
  }

  private pickTrick() {
    if (!this.trickBag.length) {
      this.trickBag = KARAMBIT_TRICKS.filter((name) => this.base.has(name));
      for (let i = this.trickBag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.trickBag[i], this.trickBag[j]] = [this.trickBag[j]!, this.trickBag[i]!];
      }
      // A refilled bag never starts with the trick that just played.
      if (this.trickBag.at(-1) === this.lastTrick && this.trickBag.length > 1)
        [this.trickBag[0], this.trickBag[this.trickBag.length - 1]] = [
          this.trickBag.at(-1)!,
          this.trickBag[0]!,
        ];
    }
    this.lastTrick = this.trickBag.pop()!;
    return this.lastTrick;
  }
}
