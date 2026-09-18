import { useEffect, useRef } from 'react';

/**
 * The hero backdrop: one fragment shader on a screen-covering triangle.
 *
 * Written against raw WebGL rather than three.js/R3F on purpose. There is no
 * scene, no camera, no geometry and no raycasting here; every one of which is
 * what those libraries exist to provide, so pulling in ~600kB for a single
 * draw call would be paying a lot for nothing. It also sidesteps R3F's
 * optional `expo` peer, which does not resolve cleanly in this project.
 */
const VERT = `#version 300 es
void main() {
  // One oversized triangle covering clip space. Cheaper than a quad: no
  // diagonal seam, three vertices instead of six, no index buffer.
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2  uRes;
uniform vec2  uMouse;
out vec4 outColor;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p  = (gl_FragCoord.xy - 0.5 * uRes.xy) / uRes.y;

  float t = uTime * 0.045;
  vec2 q = p * 1.35 + vec2(t, -t * 0.6);
  float n = fbm(q + fbm(q * 1.7 + t) * 0.6);

  // the pointer lifts the surface, so it feels touched rather than looped
  float m = 1.0 - smoothstep(0.0, 0.85, length(p - uMouse));
  n += m * 0.16;

  vec3 violet = vec3(0.545, 0.486, 1.0);
  vec3 teal   = vec3(0.275, 0.898, 0.816);
  vec3 col    = mix(violet, teal, smoothstep(0.35, 0.78, n + p.x * 0.25));

  col *= smoothstep(0.34, 0.92, n) * 1.05;

  // a slow horizontal sweep, like an inspection pass over the wall
  float sweep = smoothstep(0.004, 0.0, abs(uv.y - fract(uTime * 0.06)));
  col += teal * sweep * 0.16;

  // vignette, so the type always wins
  col *= 1.0 - smoothstep(0.48, 1.3, length(p * vec2(0.8, 1.2)));

  outColor = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return; // no WebGL2: the CSS gradient underneath is the fallback

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');

    // Cap DPR: a 3x retina panel would shade 9x the fragments for no gain.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 1.6;
      target.y = -(e.clientY / window.innerHeight - 0.5) * 1.0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let running = true;
    const start = performance.now();
    const frame = (now: number) => {
      if (!running) return;
      // ease toward the pointer; snapping to it reads as jitter
      eased.x += (target.x - eased.x) * 0.045;
      eased.y += (target.y - eased.y) * 0.045;
      gl.uniform2f(uMouse, eased.x, eased.y);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Stop shading entirely when the tab is hidden or the hero scrolls away.
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // A lost context paints white, which would wash out the whole hero. Stop
    // drawing and let the CSS gradient underneath stand in.
    const onLost = (e: Event) => {
      e.preventDefault();
      running = false;
      cancelAnimationFrame(raf);
      canvas.style.opacity = '0';
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('webglcontextlost', onLost);
      document.removeEventListener('visibilitychange', onVisibility);
      // Deliberately NOT calling WEBGL_lose_context here. StrictMode runs
      // effects twice in development, so this cleanup fires while the second
      // mount is already using the context; force-losing it leaves a blank
      // white canvas. Dropping the references is enough; the browser reclaims
      // the context when the canvas is collected.
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 size-full" aria-hidden />;
}

export default HeroCanvas;
