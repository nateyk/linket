import {useMemo} from 'react';
import {
  BackgroundCanvas,
  type BackgroundCanvasProps,
} from './background-canvas';

export interface StarfieldProps extends Omit<
  BackgroundCanvasProps,
  'scene' | 'colors' | 'palettes' | 'uniforms'
> {
  color?: string;
  density?: number;
  depth?: number;
  direction?: number;
  glow?: number;
  haze?: number;
  hazeColors?: readonly string[];
  intensity?: number;
  size?: number;
  twinkle?: number;
  warmth?: number;
  warp?: number;
}

const HAZE = ['var(--primary)', 'var(--foreground)'] as const;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

// Based on the supplied Starfield GLSL scene. The BackgroundCanvas runtime
// provides the uPointer, uTime, uDark, OKLab and fbm helpers.
export const STARFIELD_SCENE = String.raw`
uniform vec3 uColor;
uniform vec3 uHazeColors[8];
uniform int uHazeColorsCount;
uniform float uDensity;
uniform float uDepth;
uniform float uDirection;
uniform float uGlow;
uniform float uHaze;
uniform float uIntensity;
uniform float uSize;
uniform float uTwinkle;
uniform float uWarmth;
uniform float uWarp;

vec3 legible(vec3 c) {
  vec3 lab = toOklab(c);
  float ground = toOklab(uSurface).x;
  lab.x = mix(lab.x, ground > 0.5 ? 0.2 : 0.97,
    1.0 - smoothstep(0.1, 0.22, abs(lab.x - ground)));
  return lab;
}

vec4 stars(vec2 p, float z, float px, float seed, float crowd, mat2 turn, mat3 tones) {
  vec4 sum = vec4(0.0);
  vec2 base = floor(p - 0.5);
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      vec2 cell = base + vec2(float(i), float(j));
      vec3 h = hash32(cell + seed);
      vec2 gap = p - cell - h.xy;
      if (dot(gap, gap) > 0.25) continue;
      vec2 d = (gap * turn) * px;
      float dist = length(d);
      float mag = h.z * h.z * h.z;
      float r = uSize * uPixelRatio * mix(0.6, 1.1, z) * (0.7 + 1.5 * mag);
      float rr = max(r, 0.85);
      float bright = smoothstep(0.4, 1.0, mag) * uGlow;
      if (dist > rr * (bright > 0.0 ? 30.0 : 3.0)) continue;
      vec3 k = hash32(cell * 1.31 + seed + 17.3);
      if (k.z > 0.86) continue;
      float beat = sin(uTime * (0.5 + 1.9 * k.x) + k.y * TAU)
        * sin(uTime * (0.23 + 0.6 * k.y) + k.x * TAU);
      float b = (0.5 + 0.5 * mag)
        * (1.0 - uTwinkle * 0.8 * (0.5 + 0.5 * beat)) * (r / rr);
      float core = exp(-dist * dist / (rr * rr));
      float halo = mix(0.25, 0.45, uDark) * exp(-dist / (rr * 2.6));
      float arms = mix(0.3, 0.6, uDark)
        * exp(-min(abs(d.x), abs(d.y)) / (rr * 0.4) - dist / (rr * 5.0));
      float amount = (core + bright * (halo + arms)) * b
        * (1.0 - smoothstep(0.32, 0.5, dist / px))
        * (1.0 - smoothstep(crowd - 0.07, crowd + 0.07, k.z));
      float t = fract(k.z * 31.7) * 2.0 - 1.0;
      vec3 tone = mix(tones[0], t > 0.0 ? tones[2] : tones[1],
        smoothstep(0.2, 1.0, abs(t)) * uWarmth);
      sum += vec4(tone * amount, amount);
    }
  }
  return sum;
}

vec4 scene(vec2 frag) {
  vec2 p = centered(frag) * mix(1.05, 1.0, uIntro);
  vec2 lean = (uPointer.xy / uResolution - 0.5) * uPointer.z;
  vec2 way = vec2(cos(uDirection), sin(uDirection));
  float drift = uTime * (1.0 - 0.85 * uWarp);

  vec2 hp = fitted(frag) - lean * 0.012 * uDepth - way * drift * 0.004;
  float cloud = fbm(hp * 1.3 + vec2(3.1, 1.7), 3) * 0.5 + 0.5;
  float lane = exp(-pow(dot(hp, vec2(-0.42, 0.91)) * 2.4, 2.0));
  float mist = smoothstep(0.4, 1.15, cloud + lane * 0.5);
  float turn = smoothstep(0.25, 0.75,
    fbm(hp * 0.9 - vec2(7.3, 2.9), 2) * 0.5 + 0.5);
  vec4 haze = glow(ramp(uHazeColors, uHazeColorsCount, turn),
    mist * uHaze * uIntensity * uIntro * mix(0.2, 0.3, uDark));

  vec3 lab = legible(uColor);
  float tinted = mix(lab.x, mix(0.5, 0.86, uDark), 0.7);
  mat3 tones = mat3(
    fromOklab(lab),
    fromOklab(vec3(tinted, lab.yz + vec2(-0.03, -0.14))),
    fromOklab(vec3(tinted, lab.yz + vec2(0.06, 0.12)))
  );

  vec4 sum = vec4(0.0);
  float spread = clamp(uDepth, 0.0, 1.0);
  float pack = inversesqrt(max(uDensity, 0.05));
  for (int l = 0; l < 5; l++) {
    float fl = float(l);
    float rest = (fl + 0.5) / 5.0;
    float z = fract(rest + uTime * 0.02 * uWarp);
    float cell = 30.0 * pow(4.6, z) * pack;
    float home = 30.0 * pow(4.6, rest) * pack;
    float pace = 4.5 * mix(1.0 / home, 1.0 / (64.0 * pack), spread);
    mat2 spin = rotate(fl * 0.71 + 0.4);
    vec2 q = spin * (
      (p - lean * 26.0 * uDepth * (0.15 + z)) / cell - way * drift * pace
    ) + fl * 13.7;
    float fade = smoothstep(0.0, 0.1, z)
      * (1.0 - smoothstep(0.9, 1.0, z));
    float crowd = mix(mix(0.4, 0.9, mist), 0.72, z);
    sum += stars(q, z, cell * uPixelRatio, fl * 37.0, crowd, spin, tones)
      * fade * mix(0.7, 1.0, z);
  }
  vec3 color = sum.a > 0.0 ? sum.rgb / sum.a : vec3(0.0);
  vec4 sky = glow(color,
    sum.a * uIntensity * uIntro * mix(1.2, 1.0, uDark));
  return over(sky, haze);
}
`;

export function Starfield({
  color = 'var(--foreground)',
  density = 1,
  depth = 0.7,
  direction = 160,
  glow = 0.5,
  haze = 0.5,
  hazeColors = HAZE,
  intensity = 1,
  size = 1,
  twinkle = 0.5,
  warmth = 0.6,
  warp = 0,
  ...rest
}: StarfieldProps) {
  const colors = useMemo(() => ({uColor: color}), [color]);
  const palette = useMemo(() => ({uHazeColors: hazeColors}), [hazeColors]);
  const uniforms = useMemo(() => ({
    uDensity: density,
    uDepth: depth,
    uDirection: radians(direction),
    uGlow: glow,
    uHaze: haze,
    uIntensity: intensity,
    uSize: size,
    uTwinkle: twinkle,
    uWarmth: warmth,
    uWarp: warp,
  }), [density, depth, direction, glow, haze, intensity, size, twinkle, warmth, warp]);

  return (
    <BackgroundCanvas
      {...rest}
      data-slot="starfield"
      scene={STARFIELD_SCENE}
      colors={colors}
      palettes={palette}
      uniforms={uniforms}
      still={8}
      fallback="radial-gradient(ellipse at 50% 45%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 75%)"
    />
  );
}
