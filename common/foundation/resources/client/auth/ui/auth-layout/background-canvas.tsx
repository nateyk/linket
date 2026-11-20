import Color from 'colorjs.io';
import {useEffect, useRef, type ComponentProps} from 'react';
import {cn} from '@ui/utils/cn';

/**
 * Local WebGL2 renderer for procedural, decoration-only backgrounds.
 * One draw call, no new packages, no interaction interception.
 */
export interface BackgroundCanvasProps extends Omit<ComponentProps<'div'>, 'color'> {
  scene: string;
  colors?: Record<string, string>;
  palettes?: Record<string, readonly string[]>;
  uniforms?: Record<string, number | boolean>;
  quality?: number;
  speed?: number;
  still?: number;
  interactive?: boolean;
  paused?: boolean;
  fallback?: string;
  'data-slot'?: string;
}

const VERTEX = String.raw`#version 300 es
precision highp float;
void main() {
  vec2 position = vec2(
    (gl_VertexID == 2) ? 3.0 : -1.0,
    (gl_VertexID == 1) ? 3.0 : -1.0
  );
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const HELPERS = String.raw`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uPointer;
uniform float uIntro;
uniform vec3 uSurface;
uniform float uDark;
out vec4 outputColor;
const float TAU = 6.28318530718;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
vec3 hash32(vec2 p) {
  return vec3(
    hash21(p + 1.3),
    hash21(p + 17.7),
    hash21(p + 91.1)
  );
}
mat2 rotate(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x);
  float b = mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), u.x);
  return mix(a, b, u.y) * 2.0 - 1.0;
}
float fbm(vec2 p, int octaves) {
  float value = 0.0, amplitude = 0.5;
  for (int k = 0; k < 5; k++) {
    if (k >= octaves) break;
    value += noise2(p) * amplitude;
    p = rotate(0.53) * p * 2.02 + vec2(7.3, -3.2);
    amplitude *= 0.5;
  }
  return value;
}
vec2 centered(vec2 frag) {
  return (frag - uResolution * 0.5) / uPixelRatio;
}
vec2 fitted(vec2 frag) {
  return (frag - uResolution * 0.5) / min(uResolution.x, uResolution.y);
}
vec4 glow(vec3 c, float a) {
  float opacity = clamp(a, 0.0, 1.0);
  return vec4(c * opacity, opacity);
}
vec4 over(vec4 a, vec4 b) {
  return a + b * (1.0 - a.a);
}
vec3 toOklab(vec3 rgb) {
  vec3 c = max(rgb, 0.0);
  vec3 linear = pow(c, vec3(2.2));
  vec3 lms = mat3(
    0.4122214708, 0.5363325363, 0.0514459929,
    0.2119034982, 0.6806995451, 0.1073969566,
    0.0883024619, 0.2817188376, 0.6299787005
  ) * linear;
  vec3 r = pow(max(lms, 0.0), vec3(1.0 / 3.0));
  return mat3(
    0.2104542553, 0.7936177850, -0.0040720468,
    1.9779984951, -2.4285922050, 0.4505937099,
    0.0259040371, 0.7827717662, -0.8086757660
  ) * r;
}
vec3 fromOklab(vec3 lab) {
  vec3 t = mat3(
    1.0, 0.3963377774, 0.2158037573,
    1.0, -0.1055613458, -0.0638541728,
    1.0, -0.0894841775, -1.2914855480
  ) * lab;
  vec3 rgb = mat3(
    4.0767416621, -3.3077115913, 0.2309699292,
    -1.2684380046, 2.6097574011, -0.3413193965,
    -0.0041960863, -0.7034186147, 1.7076147010
  ) * (t * t * t);
  return pow(clamp(rgb, 0.0, 1.0), vec3(1.0 / 2.2));
}
vec3 ramp(vec3 colors[8], int count, float t) {
  float segment = clamp(t, 0.0, 0.9999) * float(max(count - 1, 1));
  int left = clamp(int(floor(segment)), 0, 7);
  int right = min(left + 1, max(count - 1, 0));
  return mix(colors[left], colors[right], fract(segment));
}
`;

function rgb(input: string, fallback: string): [number, number, number] {
  try {
    const coords = new Color(input).to('srgb').coords;
    return [0, 1, 2].map(index =>
      Math.min(1, Math.max(0, Number(coords[index]) || 0)),
    ) as [number, number, number];
  } catch {
    const coords = new Color(fallback).to('srgb').coords;
    return [coords[0], coords[1], coords[2]];
  }
}

function resolveColor(root: HTMLElement, color: string) {
  const variable = /^var\((--[\w-]+)\)$/.exec(color.trim());
  if (!variable) return color;
  return getComputedStyle(root).getPropertyValue(variable[1]).trim() ||
    getComputedStyle(document.documentElement).getPropertyValue(variable[1]).trim() ||
    '#0049cc';
}

function luminance([r, g, b]: [number, number, number]) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function shader(gl: WebGL2RenderingContext, type: number, source: string) {
  const value = gl.createShader(type);
  if (!value) throw new Error('Cannot create WebGL shader');
  gl.shaderSource(value, source);
  gl.compileShader(value);
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(value);
    gl.deleteShader(value);
    throw new Error(error || 'Cannot compile background shader');
  }
  return value;
}

function mountBackground(
  root: HTMLDivElement,
  canvas: HTMLCanvasElement,
  options: Required<Pick<BackgroundCanvasProps, 'scene' | 'quality' | 'speed' | 'still' | 'interactive' | 'paused'>> &
    Pick<BackgroundCanvasProps, 'colors' | 'palettes' | 'uniforms'>,
) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  if (!gl) {
    root.dataset.state = 'unsupported';
    return () => {};
  }

  let program: WebGLProgram | null = null;
  let vertex: WebGLShader | null = null;
  let fragment: WebGLShader | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  try {
    vertex = shader(gl, gl.VERTEX_SHADER, VERTEX);
    fragment = shader(
      gl,
      gl.FRAGMENT_SHADER,
      HELPERS + '\n' + options.scene +
        '\nvoid main(){ outputColor = clamp(scene(gl_FragCoord.xy), 0.0, 1.0); }\n',
    );
    program = gl.createProgram();
    if (!program) throw new Error('Cannot create WebGL program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Cannot link background program');
    }
    vao = gl.createVertexArray();
  } catch (error) {
    console.warn('Auth starfield WebGL is unavailable', error);
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    root.dataset.state = 'unsupported';
    return () => {};
  }

  const gpuProgram = program;
  gl.useProgram(gpuProgram);
  gl.bindVertexArray(vao);
  const location = (name: string) => gl.getUniformLocation(gpuProgram, name);
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  const setFloat = (name: string, value: number) => {
    if (!uniforms.has(name)) uniforms.set(name, location(name));
    gl.uniform1f(uniforms.get(name)!, value);
  };
  const setVec3 = (name: string, value: [number, number, number]) => {
    if (!uniforms.has(name)) uniforms.set(name, location(name));
    gl.uniform3fv(uniforms.get(name)!, value);
  };
  let width = 0;
  let height = 0;
  let raf = 0;
  let visible = true;
  let disposed = false;
  let pointerX = 0;
  let pointerY = 0;
  let pointerActive = 0;
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let pointerTargetActive = 0;
  let start = performance.now();
  let pausedAt = 0;
  let paletteDirty = true;
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduced = !!media?.matches;
  const isActive = () => !disposed && visible && !document.hidden;

  function updatePalette() {
    const css = getComputedStyle(document.documentElement);
    const base = rgb(css.getPropertyValue('--background').trim() || '#fff', '#fff');
    setVec3('uSurface', base);
    setFloat('uDark', luminance(base) < 0.5 ? 1 : 0);
    Object.entries(options.colors || {}).forEach(([name, color]) =>
      setVec3(name, rgb(resolveColor(root, color), '#ffffff')),
    );
    Object.entries(options.palettes || {}).forEach(([name, colors]) => {
      const flat = new Float32Array(24);
      colors.slice(0, 8).forEach((color, i) => {
        flat.set(rgb(resolveColor(root, color), '#0049cc'), i * 3);
      });
      if (!uniforms.has(name)) uniforms.set(name, location(name + '[0]'));
      gl.uniform3fv(uniforms.get(name)!, flat);
      if (!uniforms.has(name + 'Count')) uniforms.set(name + 'Count', location(name + 'Count'));
      gl.uniform1i(uniforms.get(name + 'Count')!, Math.min(colors.length, 8));
    });
  }

  function resize() {
    const rect = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * Math.min(1, Math.max(0.25, options.quality));
    const nextWidth = Math.max(1, Math.round(rect.width * dpr));
    const nextHeight = Math.max(1, Math.round(rect.height * dpr));
    if (nextWidth !== width || nextHeight !== height) {
      width = canvas.width = nextWidth;
      height = canvas.height = nextHeight;
      gl.viewport(0, 0, width, height);
    }
    if (!uniforms.has('uResolution')) uniforms.set('uResolution', location('uResolution'));
    gl.uniform2f(uniforms.get('uResolution')!, width, height);
    setFloat('uPixelRatio', dpr);
  }

  function draw(now: number) {
    raf = 0;
    if (!isActive()) return;
    resize();
    const nowSeconds = Math.max(0, (now - start) / 1000);
    const nextTime = reduced ? options.still : options.paused ? pausedAt : nowSeconds * options.speed;
    pointerX += (pointerTargetX - pointerX) * 0.08;
    pointerY += (pointerTargetY - pointerY) * 0.08;
    pointerActive += (pointerTargetActive - pointerActive) * 0.07;
    gl.useProgram(gpuProgram);
    if (paletteDirty) {
      updatePalette();
      paletteDirty = false;
    }
    setFloat('uTime', nextTime);
    setFloat('uIntro', reduced ? 1 : Math.min(1, nowSeconds * 0.8));
    if (!uniforms.has('uPointer')) uniforms.set('uPointer', location('uPointer'));
    gl.uniform3f(uniforms.get('uPointer')!, pointerX, pointerY, reduced ? 0 : pointerActive);
    Object.entries(options.uniforms || {}).forEach(([name, value]) =>
      setFloat(name, typeof value === 'boolean' ? Number(value) : value),
    );
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    root.dataset.state = reduced ? 'still' : 'live';
    if (!reduced && !options.paused) raf = requestAnimationFrame(draw);
  }

  function schedule() {
    if (raf || !isActive()) return;
    raf = requestAnimationFrame(draw);
  }
  function pointerMove(event: PointerEvent) {
    if (!options.interactive || reduced) return;
    const rect = root.getBoundingClientRect();
    pointerTargetActive =
      event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom ? 1 : 0;
    if (pointerTargetActive) {
      pointerTargetX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * width;
      pointerTargetY = (1 - (event.clientY - rect.top) / Math.max(1, rect.height)) * height;
    }
    schedule();
  }
  function visibility() { schedule(); }
  function reducedChange(event: MediaQueryListEvent) {
    reduced = event.matches;
    pointerTargetActive = 0;
    schedule();
  }

  const observer = typeof IntersectionObserver === 'undefined' ? null :
    new IntersectionObserver(entries => {
      visible = !!entries[0]?.isIntersecting;
      schedule();
    });
  observer?.observe(root);
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null :
    new ResizeObserver(schedule);
  resizeObserver?.observe(root);
  const themeObserver = typeof MutationObserver === 'undefined' ? null :
    new MutationObserver(() => {
      paletteDirty = true;
      schedule();
    });
  themeObserver?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style', 'data-theme'],
  });
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('resize', schedule);
  if (options.interactive) window.addEventListener('pointermove', pointerMove, {passive: true});
  media?.addEventListener?.('change', reducedChange);
  if (options.paused) pausedAt = options.still;
  schedule();

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    observer?.disconnect();
    resizeObserver?.disconnect();
    themeObserver?.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('pointermove', pointerMove);
    media?.removeEventListener?.('change', reducedChange);
    gl.bindVertexArray(null);
    gl.useProgram(null);
    if (vao) gl.deleteVertexArray(vao);
    gl.deleteProgram(gpuProgram);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  };
}

export function BackgroundCanvas({
  scene,
  colors,
  palettes,
  uniforms,
  quality = 0.8,
  speed = 1,
  still = 8,
  interactive = true,
  paused = false,
  fallback,
  className,
  children,
  'data-slot': dataSlot = 'background-canvas',
  ...rest
}: BackgroundCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!rootRef.current || !canvasRef.current) return;
    return mountBackground(rootRef.current, canvasRef.current, {
      scene, colors, palettes, uniforms, quality, speed, still, interactive, paused,
    });
  }, [scene, colors, palettes, uniforms, quality, speed, still, interactive, paused]);

  return (
    <div
      {...rest}
      ref={rootRef}
      data-slot={dataSlot}
      data-state="loading"
      className={cn('group/background relative isolate overflow-hidden', className)}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" data-slot="background-canvas-layer">
        {fallback && (
          <div
            className="absolute inset-0 opacity-100 transition-opacity duration-300 group-data-[state=live]/background:opacity-0 group-data-[state=still]/background:opacity-0"
            data-slot="background-canvas-fallback"
            style={{background: fallback}}
          />
        )}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 block size-full opacity-0 transition-opacity duration-300 group-data-[state=live]/background:opacity-100 group-data-[state=still]/background:opacity-100"
          data-slot="background-canvas-canvas"
        />
      </div>
      {children}
    </div>
  );
}
