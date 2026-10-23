import { BALL_R } from "@/lib/pool/physics";

/**
 * Presentation-only ball orientation. The physics engine stores no angular
 * velocity. Roll is integrated from screen travel and table distance so the
 * stripe and number turn while a ball moves. It is not part of the shot.
 */

export function identityOrientation(): number[] {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

function multiply(a: readonly number[], b: readonly number[]): number[] {
  const out = new Array<number>(9);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      out[row * 3 + col] =
        a[row * 3]! * b[col]! + a[row * 3 + 1]! * b[3 + col]! + a[row * 3 + 2]! * b[6 + col]!;
    }
  }
  return out;
}

/** Row-major rotation. Positive angle is right-handed. */
function rotation(ax: number, ay: number, az: number, angle: number): number[] {
  const len = Math.hypot(ax, ay, az) || 1;
  ax /= len;
  ay /= len;
  az /= len;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * ax * ax + c,
    t * ax * ay - s * az,
    t * ax * az + s * ay,
    t * ax * ay + s * az,
    t * ay * ay + c,
    t * ay * az - s * ax,
    t * ax * az - s * ay,
    t * ay * az + s * ax,
    t * az * az + c,
  ];
}

/**
 * `screenDx` is canvas-right, `screenDy` is canvas-down. `tableDist` is the
 * authoritative travel in micrometres, so the spin matches the cloth, not the
 * foreshortened pixels.
 */
export function rollOrientation(
  rot: readonly number[],
  screenDx: number,
  screenDy: number,
  tableDist: number,
): number[] {
  const vlen = Math.hypot(screenDx, screenDy);
  if (vlen < 1e-4 || tableDist < 1) return rot.slice();
  const spin = rotation(screenDy / vlen, screenDx / vlen, 0, tableDist / BALL_R);
  return multiply(spin, rot);
}

export type BallSprite = {
  id: number;
  x: number;
  y: number;
  radius: number;
  fade: number;
  color: readonly [number, number, number];
  stripe: boolean;
  rot: readonly number[];
};

export type BallLayer = {
  disposed: boolean;
  resize(width: number, height: number): void;
  draw(sprites: readonly BallSprite[]): boolean;
  dispose(): void;
};

const VERT = `
attribute vec2 aPos;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uRadius;
varying vec2 vUv;
void main() {
  vUv = aPos;
  vec2 px = uCenter + aPos * uRadius;
  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uFade;
uniform float uStripe;
uniform float uId;
uniform vec3 uCol0;
uniform vec3 uCol1;
uniform vec3 uCol2;
uniform sampler2D uAtlas;
void main() {
  float r2 = dot(vUv, vUv);
  float edge = smoothstep(1.0, 0.93, r2);
  if (edge <= 0.0) discard;
  float z = sqrt(max(0.0, 1.0 - r2));
  vec3 viewN = normalize(vec3(vUv.x, -vUv.y, z));
  vec3 objN = normalize(vec3(dot(uCol0, viewN), dot(uCol1, viewN), dot(uCol2, viewN)));
  vec3 resin = uColor;
  if (uStripe > 0.5) {
    resin = abs(objN.z) < 0.36 ? uColor : vec3(0.965, 0.945, 0.905);
  }
  if (uId > 0.5 && objN.z > 0.58) {
    vec2 local = objN.xy / objN.z;
    if (dot(local, local) < 0.22) {
      vec2 uv = local / 0.86 + 0.5;
      float col = mod(uId, 4.0);
      float row = floor(uId / 4.0);
      vec2 cell = vec2(col + mix(0.18, 0.82, uv.x), row + (1.0 - mix(0.18, 0.82, uv.y)));
      vec2 atlas = vec2(cell.x / 4.0, 1.0 - cell.y / 4.0);
      float glyph = texture2D(uAtlas, atlas).a;
      vec3 paper = vec3(0.96, 0.94, 0.90);
      resin = mix(paper, vec3(0.08, 0.07, 0.06), glyph);
    }
  }
  vec3 light = normalize(vec3(-0.34, 0.52, 0.78));
  vec3 fill = normalize(vec3(0.42, -0.18, 0.72));
  float ndl = max(0.0, dot(viewN, light));
  float wrap = max(0.0, dot(viewN, fill));
  vec3 view = vec3(0.0, 0.0, 1.0);
  float spec = pow(max(0.0, dot(reflect(-light, viewN), view)), 46.0);
  float spec2 = pow(max(0.0, dot(reflect(-fill, viewN), view)), 28.0);
  float fres = pow(1.0 - max(0.0, viewN.z), 2.6);
  float shade = 0.16 + 0.74 * ndl + 0.18 * wrap;
  vec3 color = resin * shade;
  color += vec3(1.0, 0.985, 0.94) * spec * 0.72;
  color += vec3(0.82, 0.9, 1.0) * spec2 * 0.16;
  color += vec3(0.75, 0.84, 1.0) * fres * 0.22;
  color *= mix(0.55, 1.0, uFade);
  float alpha = edge * uFade;
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("pool ball shader", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function numberAtlas(): HTMLCanvasElement {
  const cell = 64;
  const canvas = document.createElement("canvas");
  canvas.width = cell * 4;
  canvas.height = cell * 4;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#14120f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 40px ui-sans-serif, system-ui, sans-serif";
  for (let n = 1; n <= 15; n++) {
    const col = n % 4;
    const row = Math.floor(n / 4);
    ctx.fillText(String(n), col * cell + cell / 2, row * cell + cell / 2 + 1);
  }
  return canvas;
}

/** One WebGL1 context, one program, one atlas. Null when WebGL is missing. */
export function createBallLayer(canvas: HTMLCanvasElement): BallLayer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;
  const vert = compile(gl, gl.VERTEX_SHADER, VERT);
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vert || !frag) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("pool ball program", gl.getProgramInfoLog(program));
    return null;
  }
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const atlas = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, atlas);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, numberAtlas());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const loc = {
    res: gl.getUniformLocation(program, "uRes"),
    center: gl.getUniformLocation(program, "uCenter"),
    radius: gl.getUniformLocation(program, "uRadius"),
    color: gl.getUniformLocation(program, "uColor"),
    fade: gl.getUniformLocation(program, "uFade"),
    stripe: gl.getUniformLocation(program, "uStripe"),
    id: gl.getUniformLocation(program, "uId"),
    c0: gl.getUniformLocation(program, "uCol0"),
    c1: gl.getUniformLocation(program, "uCol1"),
    c2: gl.getUniformLocation(program, "uCol2"),
    atlas: gl.getUniformLocation(program, "uAtlas"),
  };
  let lost = false;
  let disposed = false;
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  canvas.addEventListener("webglcontextlost", onLost);

  return {
    get disposed() {
      return disposed;
    },
    resize(width: number, height: number) {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    },
    draw(sprites: readonly BallSprite[]) {
      if (disposed || lost || gl.isContextLost()) return false;
      try {
        while (gl.getError() !== gl.NO_ERROR) {
          /* drop a stale error from a replaced context */
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform2f(loc.res, canvas.width, canvas.height);
        gl.uniform1i(loc.atlas, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, atlas);
        for (const sprite of sprites) {
          if (sprite.radius < 1 || sprite.fade <= 0) continue;
          const rot = sprite.rot;
          gl.uniform2f(loc.center, sprite.x, sprite.y);
          gl.uniform1f(loc.radius, sprite.radius);
          gl.uniform3f(loc.color, sprite.color[0], sprite.color[1], sprite.color[2]);
          gl.uniform1f(loc.fade, sprite.fade);
          gl.uniform1f(loc.stripe, sprite.stripe ? 1 : 0);
          gl.uniform1f(loc.id, sprite.id);
          gl.uniform3f(loc.c0, rot[0] ?? 1, rot[3] ?? 0, rot[6] ?? 0);
          gl.uniform3f(loc.c1, rot[1] ?? 0, rot[4] ?? 1, rot[7] ?? 0);
          gl.uniform3f(loc.c2, rot[2] ?? 0, rot[5] ?? 0, rot[8] ?? 1);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        gl.flush();
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
          disposed = true;
          return false;
        }
        return true;
      } catch {
        disposed = true;
        return false;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteTexture(atlas);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    },
  };
}
