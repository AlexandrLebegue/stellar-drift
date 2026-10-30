import * as THREE from 'three';

let chunkPatched = false;

// Overrides three's project_vertex chunk so every built-in material can
// snap its clip-space position to the low-res pixel grid (PS1 wobble).
// The snap only compiles when USE_PS1_SNAP is defined (see applyPS1).
function patchVertexSnapChunk() {
  if (chunkPatched) return;
  chunkPatched = true;
  const chunk = (THREE as any).ShaderChunk;
  chunk['project_vertex'] = `
vec4 mvPosition = vec4( position, 1.0 );
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
vec4 ps1Pos = projectionMatrix * mvPosition;
#ifdef USE_PS1_SNAP
	vec2 ps1Uv = (ps1Pos.xy / max(ps1Pos.w, 0.00001) + 1.0) * 0.5;
	ps1Uv = floor(ps1Uv * uPS1Res + 0.5) / uPS1Res;
	ps1Pos.xy = (ps1Uv * 2.0 - 1.0) * max(ps1Pos.w, 0.00001);
#endif
gl_Position = ps1Pos;
`;
}

// Attach PS1 vertex snapping to a built-in material (MeshLambert/Phong/Basic...).
// All snapped materials share the same low-res Vector2, so one resize updates all.
export function applyPS1(mat: THREE.Material, res: THREE.Vector2): THREE.Material {
  const m = mat as any;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader: any) => {
    if (typeof prev === 'function') prev(shader);
    shader.defines = Object.assign({}, shader.defines, { USE_PS1_SNAP: '' });
    shader.uniforms.uPS1Res = { value: res };
    shader.vertexShader = 'uniform vec2 uPS1Res;\n' + shader.vertexShader;
  };
  m.needsUpdate = true;
  return mat;
}

// PS1 render pipeline:
//  1. scene -> low-res RGBA render target (240p, NearestFilter)
//  2. fullscreen quad upscales to the screen with NearestFilter,
//     5-bit-per-channel quantization + 4x4 Bayer ordered dithering,
//     subtle vignette.
export class PS1Pipeline {
  readonly renderer: THREE.WebGLRenderer;
  readonly snapRes: THREE.Vector2;
  private rt: THREE.WebGLRenderTarget;
  private postScene = new THREE.Scene();
  private postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private postMat: THREE.ShaderMaterial;
  private lowW: number;
  private lowH = 240;

  constructor(canvas: HTMLCanvasElement) {
    patchVertexSnapChunk();
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);

    this.snapRes = new THREE.Vector2(320, 240);
    this.lowW = 320;
    this.rt = new THREE.WebGLRenderTarget(320, 240, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
    });

    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) =>
      Math.round(((v + 0.5) / 16) * 255),
    );
    const bayerTex = new THREE.DataTexture(
      new Uint8Array(bayer),
      4,
      4,
      THREE.LuminanceFormat,
      THREE.UnsignedByteType,
    );
    bayerTex.magFilter = THREE.NearestFilter;
    bayerTex.minFilter = THREE.NearestFilter;
    bayerTex.needsUpdate = true;

    this.postMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null as unknown as THREE.Texture },
        uBayer: { value: bayerTex },
      },
      vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      fragmentShader: `
uniform sampler2D tScene;
uniform sampler2D uBayer;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  float b = texture2D(uBayer, (mod(gl_FragCoord.xy, 4.0) + 0.5) / 4.0).r;
  c = floor(c * 31.0 + b) / 31.0;
  vec2 p = vUv - 0.5;
  c *= 1.0 - dot(p, p) * 0.35;
  gl_FragColor = vec4(c, 1.0);
}
`,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));
  }

  // Sets the drawing buffer size and (re)computes the low-res target
  // from the window aspect (height locked at 240).
  resize(winW: number, winH: number) {
    const aspect = winW / Math.max(1, winH);
    this.renderer.setSize(winW, winH, false);
    const w = Math.max(2, Math.round(this.lowH * aspect));
    if (w !== this.lowW) {
      this.lowW = w;
      this.snapRes.set(w, this.lowH);
      this.rt.setSize(w, this.lowH);
    }
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.postMat.uniforms.tScene.value = this.rt.texture;
    this.renderer.render(this.postScene, this.postCam);
  }

  dispose() {
    this.rt.dispose();
    this.postMat.dispose();
    this.renderer.dispose();
  }
}
