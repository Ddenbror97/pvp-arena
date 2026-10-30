import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { ARENA } from "./map";

/** Baked microdetail: no per-frame procedural texture generation. */
export function createFloorDetail() {
  const rough = document.createElement("canvas"),
    bump = document.createElement("canvas");
  rough.width = rough.height = bump.width = bump.height = 256;
  const rc = rough.getContext("2d")!,
    bc = bump.getContext("2d")!;
  const r = rc.createImageData(256, 256),
    b = bc.createImageData(256, 256);
  let seed = 7331;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4,
        noise = random(),
        patch =
          0.5 +
          Math.sin(x * 0.027) * Math.cos(y * 0.031) * 0.25 +
          Math.sin(x * 0.063 + y * 0.019) * 0.12;
      const joint = x < 1 || y < 1 || x > 254 || y > 254;
      const roughness = joint ? 225 : 78 + patch * 120 + noise * 12,
        height = joint ? 50 : 128 + (noise - 0.5) * 22;
      for (let c = 0; c < 3; c++) {
        r.data[i + c] = roughness;
        b.data[i + c] = height;
      }
      r.data[i + 3] = b.data[i + 3] = 255;
    }
  rc.putImageData(r, 0, 0);
  bc.putImageData(b, 0, 0);
  const roughness = new THREE.CanvasTexture(rough),
    relief = new THREE.CanvasTexture(bump);
  for (const map of [roughness, relief]) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.colorSpace = THREE.NoColorSpace;
    map.anisotropy = 4;
  }
  return {
    roughness,
    relief,
    dispose() {
      roughness.dispose();
      relief.dispose();
    },
  };
}

/** One small planar target, throttled and adaptive. Players are deliberately excluded. */
export function createWetFloor(
  scene: THREE.Scene,
  roughness: THREE.Texture,
  excluded: THREE.Object3D[],
) {
  const reflector = new Reflector(new THREE.PlaneGeometry(ARENA.width, ARENA.depth), {
    textureWidth: 512,
    textureHeight: 512,
    multisample: 0,
    clipBias: 0.003,
    shader: {
      name: "ArenaWetFloor",
      uniforms: {
        tDiffuse: { value: null },
        color: { value: new THREE.Color(0xffffff) },
        textureMatrix: { value: new THREE.Matrix4() },
        tRoughness: { value: roughness },
      },
      vertexShader: `uniform mat4 textureMatrix; varying vec4 vReflection; varying vec2 vFloorUv; varying vec3 vFloorWorld;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main(){vReflection=textureMatrix*vec4(position,1.0);vFloorUv=uv;vFloorWorld=(modelMatrix*vec4(position,1.0)).xyz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `uniform sampler2D tDiffuse;uniform sampler2D tRoughness;uniform vec3 color;varying vec4 vReflection;varying vec2 vFloorUv;varying vec3 vFloorWorld;
        #include <common>
        #include <logdepthbuf_pars_fragment>
        void main(){
        #include <logdepthbuf_fragment>
        vec3 reflection=texture2DProj(tDiffuse,vReflection).rgb*.4;
        vec4 a=vReflection;a.xy+=vec2(.002,0.0)*a.w;reflection+=texture2DProj(tDiffuse,a).rgb*.15;
        a=vReflection;a.xy-=vec2(.002,0.0)*a.w;reflection+=texture2DProj(tDiffuse,a).rgb*.15;
        a=vReflection;a.xy+=vec2(0.0,.002)*a.w;reflection+=texture2DProj(tDiffuse,a).rgb*.15;
        a=vReflection;a.xy-=vec2(0.0,.002)*a.w;reflection+=texture2DProj(tDiffuse,a).rgb*.15;
        float wet=1.0-texture2D(tRoughness,vFloorUv*vec2(8.0,10.66667)).g;
        float facing=max(0.0,dot(normalize(cameraPosition-vFloorWorld),vec3(0.0,1.0,0.0)));
        float fresnel=pow(1.0-facing,3.0);float alpha=(.12+wet*.5)*(.3+.7*fresnel);
        gl_FragColor=vec4(reflection*vec3(.94,.96,1.0),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    },
  });
  reflector.name = "bounded-wet-floor-reflection";
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.y = 0.004;
  const material = reflector.material as THREE.ShaderMaterial;
  material.uniforms["tRoughness"]!.value = roughness;
  material.transparent = true;
  material.depthWrite = false;
  const capture = reflector.onBeforeRender;
  const position = new THREE.Vector3(999, 999, 999),
    rotation = new THREE.Quaternion(),
    visibility: boolean[] = [];
  let lastCapture = -1000,
    frames = 0,
    slow = 0,
    degraded = false;
  reflector.onBeforeRender = function (renderer, world, camera, geometry, mat, group) {
    const now = performance.now(),
      changed =
        camera.position.distanceToSquared(position) > 0.0001 ||
        Math.abs(camera.quaternion.dot(rotation)) < 0.99999;
    if (now - lastCapture < (degraded ? 100 : 50) || (!changed && now - lastCapture < 1000)) return;
    for (let i = 0; i < excluded.length; i++) {
      visibility[i] = excluded[i]!.visible;
      excluded[i]!.visible = false;
    }
    try {
      capture.call(reflector, renderer, world, camera, geometry, mat, group);
      lastCapture = now;
      position.copy(camera.position);
      rotation.copy(camera.quaternion);
    } finally {
      for (let i = 0; i < excluded.length; i++) excluded[i]!.visible = visibility[i]!;
    }
  };
  scene.add(reflector);
  return {
    update(dt: number) {
      if (++frames < 120) return;
      slow = Math.max(0, Math.min(60, slow + (dt > 24 ? 1 : -0.25)));
      const next = slow > 30;
      if (next !== degraded && (next || slow === 0)) {
        degraded = next;
        reflector.getRenderTarget().setSize(next ? 384 : 512, next ? 384 : 512);
        lastCapture = -1000;
      }
    },
    dispose() {
      reflector.dispose();
    },
  };
}
