import * as THREE from "three";

/**
 * Karambit animation state machine over the Blender-authored clips (art/blender/karambit).
 *
 * The clips animate a small control rig in the knife GLB (KR_Hand and KR_HandL: each wrist's
 * offset and turn from the two-hand stance; KR_Knife: the knife about its ring; KR_Fingers,
 * KR_Thumb, KR_FingersL: the fingers; KR_View: viewmodel framing). Three's AnimationMixer plays
 * and blends them, and `update` returns the blended controls for the viewmodel to apply to the
 * team's arms. Base states (equip, idle, idle tricks, inspect, slash, stab) cross-fade on one
 * layer; walking, running, the airborne lift and landing are additive layers on top. Purely
 * cosmetic: attacks here are local presentation; the server decides hits.
 */
type KarambitState = "hidden" | "equip" | "idle" | "trick" | "inspect" | "slash" | "stab";
export const KARAMBIT_TRICKS = [
  "karambit_idle_spin",
  "karambit_reverse_grip",
  "karambit_double_flip",
  "karambit_inspect_blade",
  "karambit_freestyle",
] as const;
/** F: one of these, at random (never the same twice running when there is a choice). */
export const KARAMBIT_INSPECTS = ["karambit_inspect", "karambit_inspect_spin"] as const;
/** Idle tricks start after this long (seconds) without relevant input, randomised. */
export const TRICK_DELAY = { min: 8, max: 15 } as const;

export type KarambitControls = {
  /** Right wrist offset from the stance (camera-space metres) and turn in the hand's frame. */
  handPosition: THREE.Vector3;
  handRotation: THREE.Quaternion;
  /** Left wrist, likewise. */
  handLPosition: THREE.Vector3;
  handLRotation: THREE.Quaternion;
  /** Elbow offsets from the stance (camera-space metres): where each forearm comes from. */
  elbowR: THREE.Vector3;
  elbowL: THREE.Vector3;
  knifeRotation: THREE.Quaternion;
  /** Right middle, ring and little fingers: 1 closed on the handle, 0 open (spins). */
  fingers: THREE.Vector3;
  /** Right thumb: 1 closed over the fingers, 0 open. */
  thumb: number;
  /** Left hand: x curl (0 relaxed, 1 loose fist), y open spread. */
  fingersL: THREE.Vector2;
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
  toAttack: 0.05,
  /** An attack cutting into a spin or an inspect: long enough that nothing snaps. */
  interrupt: 0.09,
  attackToIdle: 0.16,
  toInspect: 0.18,
} as const;

export class KarambitAnimator {
  readonly controls: KarambitControls = {
    handPosition: new THREE.Vector3(),
    handRotation: new THREE.Quaternion(),
    handLPosition: new THREE.Vector3(),
    handLRotation: new THREE.Quaternion(),
    elbowR: new THREE.Vector3(),
    elbowL: new THREE.Vector3(),
    knifeRotation: new THREE.Quaternion(),
    fingers: new THREE.Vector3(1, 1, 1),
    thumb: 1,
    fingersL: new THREE.Vector2(),
    viewPosition: new THREE.Vector3(),
    viewRotation: new THREE.Quaternion(),
  };
  /** Sound cues from the clips' keyframes (equip, flip, spin, catch, slash, stab, …). */
  onCue: ((name: string, clip: string) => void) | null = null;
  private readonly mixer: THREE.AnimationMixer;
  private readonly base = new Map<string, THREE.AnimationAction>();
  private readonly layers: Record<"walk" | "run" | "land" | "air", THREE.AnimationAction | null>;
  private readonly cues: Record<string, Cue[]>;
  private readonly nodes: Record<
    "hand" | "handL" | "elbowR" | "elbowL" | "knife" | "fingers" | "thumb" | "fingersL" | "view",
    THREE.Object3D
  >;
  private current: THREE.AnimationAction | null = null;
  private currentState: KarambitState = "hidden";
  private equipped = false;
  private idleTime = 0;
  private nextTrickAt: number;
  private lastTrick: string | null = null;
  private trickBag: string[] = [];
  private lastInspect: string | null = null;
  private lastAirborne = false;
  private weights = { walk: 0, run: 0, air: 0 };
  private strafe = 0;
  private cueTime = 0;
  private readonly scratch = { q: new THREE.Quaternion(), e: new THREE.Euler() };

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
      handL: node("KR_HandL"),
      elbowR: node("KR_Elbow"),
      elbowL: node("KR_ElbowL"),
      knife: node("KR_Knife"),
      fingers: node("KR_Fingers"),
      thumb: node("KR_Thumb"),
      fingersL: node("KR_FingersL"),
      view: node("KR_View"),
    };
    this.mixer = new THREE.AnimationMixer(rig);
    const byName = new Map(clips.map((clip) => [clip.name, clip]));
    const reference = byName.get("karambit_unequip") ?? byName.get("karambit_idle")!;
    for (const name of [
      "karambit_equip",
      "karambit_idle",
      ...KARAMBIT_INSPECTS,
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
      air: additive("karambit_air", true),
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
    const cutting = this.currentState === "inspect" || this.currentState === "trick";
    this.play(
      kind === "stab" ? "karambit_stab" : "karambit_slash",
      cutting ? BLEND.interrupt : BLEND.toAttack,
      kind,
    );
    this.idleTime = 0;
  }

  /** Manual inspect (F). Ignored while equipping, attacking or already inspecting. */
  inspect() {
    if (!this.equipped || (this.currentState !== "idle" && this.currentState !== "trick")) return;
    const choices = KARAMBIT_INSPECTS.filter((name) => this.base.has(name));
    if (!choices.length) return;
    const pool = choices.length > 1 ? choices.filter((name) => name !== this.lastInspect) : choices;
    const pick = pool[Math.floor(this.random() * pool.length) % pool.length]!;
    this.lastInspect = pick;
    this.play(pick, BLEND.toInspect, "inspect");
    this.idleTime = 0;
  }

  update(frame: KarambitFrame): KarambitControls {
    const dt = Math.max(0, Math.min(0.1, frame.dt));
    if (frame.equipped !== this.equipped) {
      this.equipped = frame.equipped;
      if (frame.equipped) {
        // Every draw starts clean: no half-finished trick or attack carries over.
        this.mixer.stopAllAction();
        for (const layer of [this.layers.walk, this.layers.run, this.layers.air]) {
          layer?.play();
          layer?.setEffectiveWeight(0);
        }
        this.weights.walk = this.weights.run = this.weights.air = 0;
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
    // Airborne: the hands lift a little and settle back (inertia), eased so nothing snaps.
    const ka = 1 - Math.exp(-dt * (frame.airborne ? 7 : 12));
    this.weights.air += ((frame.airborne ? calm : 0) - this.weights.air) * ka;
    this.layers.air?.setEffectiveWeight(this.weights.air);

    const before = this.current?.time ?? 0;
    this.mixer.update(dt);
    this.fireCues(before);

    this.read(frame.reducedMotion ? 0.25 : 1);
    // Strafing leans both wrists into the side step (procedural; one clip covers both sides).
    if (Math.abs(this.strafe) > 1e-4) {
      const c = this.controls;
      c.handPosition.x += this.strafe * 0.008;
      c.handLPosition.x += this.strafe * 0.006;
      this.scratch.q.setFromEuler(this.scratch.e.set(-this.strafe * 0.05, 0, 0));
      c.handRotation.multiply(this.scratch.q);
      c.handLRotation.multiply(this.scratch.q);
    }
    return this.controls;
  }

  /** Copy the blended control rig into `controls`. */
  private read(view = 1) {
    const c = this.controls,
      n = this.nodes;
    c.handPosition.copy(n.hand.position);
    c.handRotation.copy(n.hand.quaternion);
    c.handLPosition.copy(n.handL.position);
    c.handLRotation.copy(n.handL.quaternion);
    c.elbowR.copy(n.elbowR.position);
    c.elbowL.copy(n.elbowL.position);
    c.knifeRotation.copy(n.knife.quaternion);
    c.fingers.copy(n.fingers.position);
    c.thumb = n.thumb.position.x;
    c.fingersL.set(n.fingersL.position.x, n.fingersL.position.y);
    c.viewPosition.copy(n.view.position).multiplyScalar(view);
    c.viewRotation.identity().slerp(n.view.quaternion, view);
    return c;
  }

  /** Jump the current base clip to `seconds` (previews and tests). */
  seek(clip: string, seconds: number) {
    const action = this.base.get(clip);
    if (!action) return;
    this.mixer.stopAllAction();
    this.equipped = true;
    this.current = action;
    this.currentState =
      clip === "karambit_idle"
        ? "idle"
        : (KARAMBIT_INSPECTS as readonly string[]).includes(clip)
          ? "inspect"
          : "trick";
    action.reset().play();
    action.time = seconds;
    this.mixer.update(0);
    return this.read();
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
