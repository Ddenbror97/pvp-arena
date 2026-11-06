const angle = (v: number) => Math.atan2(Math.sin(v), Math.cos(v));
const clampPitch = (v: number) => Math.max(-1.25, Math.min(1.25, v));

/** Local camera/course separation. Only the bounded course target is sent to the server. */
export class CanopyLook {
  active = false;
  dragging = false;
  course = 0;
  pitch = -0.2;
  private offsetYaw = 0;
  private offsetPitch = 0;
  private keyboardTurning = false;

  point(heading: number, pitch: number) {
    this.course = angle(heading);
    this.pitch = clampPitch(pitch);
    this.offsetYaw = this.offsetPitch = 0;
  }

  sync(active: boolean, heading: number, pitch: number) {
    if (active && !this.active) {
      this.point(heading, pitch);
    }
    if (!active) {
      this.keyboardTurning = false;
      this.dragging = false;
      this.offsetYaw = this.offsetPitch = 0;
    }
    this.active = active;
  }

  mouse(dx: number, dy: number, sensitivity: number) {
    if (!this.active || ![dx, dy, sensitivity].every(Number.isFinite)) return;
    if (this.dragging) {
      this.offsetYaw = angle(this.offsetYaw - dx * sensitivity);
      this.offsetPitch = clampPitch(this.pitch + this.offsetPitch - dy * sensitivity) - this.pitch;
    } else {
      this.course = angle(this.course - dx * sensitivity);
      this.pitch = clampPitch(this.pitch - dy * sensitivity);
    }
  }

  /** Keyboard turns take precedence; releasing A/D must not steer back to an old mouse target. */
  keyboard(heading: number, turning: boolean) {
    if (this.active && (turning || this.keyboardTurning)) this.course = angle(heading);
    this.keyboardTurning = turning;
  }

  release() {
    this.dragging = false;
  }

  view(dtMs: number) {
    if (!this.dragging) {
      const k = Math.exp(-Math.max(0, dtMs) / 180);
      this.offsetYaw *= k;
      this.offsetPitch *= k;
    }
    return {
      yaw: angle(this.course + this.offsetYaw),
      pitch: clampPitch(this.pitch + this.offsetPitch),
    };
  }
}
