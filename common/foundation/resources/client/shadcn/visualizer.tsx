import {cn} from '@ui/utils/cn';
import {useEffect, useRef} from 'react';

// One audio graph per page. A media element can only ever be wired into it
// once, so its source node is kept and reused across re-mounts.
let context: AudioContext | undefined;
const wired = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

function getAudioContext(): AudioContext | undefined {
  if (typeof AudioContext === 'undefined') return undefined;
  return (context ??= new AudioContext());
}

/** People who ask their system for less motion get a calm refresh rate. */
const reduced = () =>
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface VisualizerProps {
  /** What to listen to: an `<audio>` / `<video>` element or a `MediaStream`. */
  source?: HTMLMediaElement | MediaStream | null;
  /** `bars`: loudness per pitch, low to high. `wave`: the sound's shape. */
  variant?: 'bars' | 'wave';
  /** How many frequency bars to render. */
  bars?: number;
  /** Bars grow symmetrically up and down from the middle instead of from the floor. */
  mirror?: boolean;
  /** Bar corner radius ratio relative to bar width (`0` = square, `0.5` = pill). Defaults to `0.5`. */
  barRadiusRatio?: number;
  /** Accessible description; without it the canvas stays decorative. */
  label?: string;
  className?: string;
}

/**
 * Theme-aware canvas audio visualizer backed by the Web Audio API.
 */
export function Visualizer({
  source = null,
  variant = 'bars',
  bars = 32,
  mirror = false,
  barRadiusRatio = 0.5,
  label,
  className,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    const target: HTMLCanvasElement = canvas;
    const ctx = source ? getAudioContext() : undefined;
    let analyser: AnalyserNode | undefined;
    let input: AudioNode | undefined;

    if (ctx && source) {
      try {
        analyser = ctx.createAnalyser();
        analyser.fftSize = variant === 'wave' ? 2048 : 256;
        analyser.smoothingTimeConstant = 0.8;
        if (
          typeof MediaStream !== 'undefined' &&
          source instanceof MediaStream
        ) {
          // Not connected to destination: a live mic played back would howl.
          input = ctx.createMediaStreamSource(source);
          void ctx.resume();
        } else if (source instanceof HTMLMediaElement) {
          input = wired.get(source);
          if (!input) {
            input = ctx.createMediaElementSource(source);
            input.connect(ctx.destination);
            wired.set(source, input as MediaElementAudioSourceNode);
          }
        }
        input?.connect(analyser);
      } catch {
        analyser = undefined;
        input = undefined;
      }
    }

    const freq = new Uint8Array(analyser?.frequencyBinCount ?? 0);
    const wave = new Uint8Array(analyser?.fftSize ?? 0);
    const levels = new Float32Array(bars);

    // Color resolves from CSS `color`, so callers control tint with `text-*`.
    let color = getComputedStyle(target).color;
    const recolor = () => {
      color = getComputedStyle(target).color;
      if (!frame) draw();
    };

    const themes =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(recolor)
        : undefined;
    themes?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });

    const scheme =
      typeof matchMedia !== 'undefined'
        ? matchMedia('(prefers-color-scheme: dark)')
        : undefined;
    scheme?.addEventListener('change', recolor);

    const size = () => {
      const dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio || 1 : 1;
      target.width = Math.round(target.clientWidth * dpr);
      target.height = Math.round(target.clientHeight * dpr);
      if (!frame) draw();
    };

    function draw() {
      if (!g) return;
      const {width: w, height: h} = target;
      if (w === 0 || h === 0) return;

      g.clearRect(0, 0, w, h);
      g.fillStyle = color;
      g.strokeStyle = color;

      if (variant === 'wave') {
        const dpr =
          typeof devicePixelRatio !== 'undefined' ? devicePixelRatio || 1 : 1;
        g.lineWidth = 2 * dpr;
        g.lineJoin = 'round';
        g.lineCap = 'round';
        g.beginPath();
        const n = analyser ? wave.length : 2;
        for (let i = 0; i < n; i++) {
          const v = analyser ? (wave[i] - 128) / 128 : 0;
          const x = (i / (n - 1)) * w;
          const y = h / 2 - v * (h / 2 - g.lineWidth);
          if (i) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
        return;
      }

      const gap = Math.max(2, (w / bars) * 0.25);
      const bw = Math.max(1, (w - gap * (bars - 1)) / bars);
      const radiusRatio = Math.min(0.5, Math.max(0, barRadiusRatio));
      const cornerRadius = bw * radiusRatio;
      for (let i = 0; i < bars; i++) {
        const bh = Math.max(bw, levels[i] * h);
        const y = mirror ? (h - bh) / 2 : h - bh;
        // Resting bars draw as subtle dots/squares; active frequencies brighten smoothly.
        g.globalAlpha = 0.25 + 0.75 * Math.min(1, levels[i] * 3);
        g.beginPath();
        if (cornerRadius <= 0) {
          g.rect(i * (bw + gap), y, bw, bh);
        } else if (typeof g.roundRect === 'function') {
          g.roundRect(i * (bw + gap), y, bw, bh, cornerRadius);
        } else {
          g.rect(i * (bw + gap), y, bw, bh);
        }
        g.fill();
      }
      g.globalAlpha = 1;
    }

    /** Spreads spectrum bins along a curve so low frequencies stay balanced. */
    function measure() {
      if (!analyser) return 0;
      if (variant === 'wave') {
        analyser.getByteTimeDomainData(wave);
        let peak = 0;
        for (const v of wave) peak = Math.max(peak, Math.abs(v - 128) / 128);
        return peak;
      }
      analyser.getByteFrequencyData(freq);
      const usable = Math.floor(freq.length * 0.7);
      let peak = 0;
      for (let i = 0; i < bars; i++) {
        const from = Math.floor(usable * (i / bars) ** 1.6);
        const to = Math.max(
          from + 1,
          Math.floor(usable * ((i + 1) / bars) ** 1.6),
        );
        let sum = 0;
        for (let j = from; j < to; j++) sum += freq[j];
        levels[i] = sum / (to - from) / 255;
        peak = Math.max(peak, levels[i]);
      }
      return peak;
    }

    let frame = 0;
    let last = 0;
    let visible = true;
    const playing = () =>
      typeof MediaStream !== 'undefined' && source instanceof MediaStream
        ? source.active
        : !!source && 'paused' in source && !source.paused;

    function tick(now: number) {
      frame = 0;
      if (reduced() && now - last < 125) {
        frame = requestAnimationFrame(tick);
        return;
      }
      last = now;
      const peak = measure();
      draw();
      if (visible && (playing() || peak > 0.01)) {
        frame = requestAnimationFrame(tick);
      }
    }

    const kick = () => {
      if (typeof HTMLMediaElement !== 'undefined' && source instanceof HTMLMediaElement) {
        void ctx?.resume();
      }
      if (!frame && visible) frame = requestAnimationFrame(tick);
    };

    const seen =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? true;
            if (visible) kick();
          })
        : undefined;
    seen?.observe(target);

    const resized =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(size)
        : undefined;
    resized?.observe(target);

    const media =
      typeof HTMLMediaElement !== 'undefined' &&
      source instanceof HTMLMediaElement
        ? source
        : undefined;
    media?.addEventListener('play', kick);
    size();
    kick();

    return () => {
      cancelAnimationFrame(frame);
      seen?.disconnect();
      resized?.disconnect();
      themes?.disconnect();
      scheme?.removeEventListener('change', recolor);
      media?.removeEventListener('play', kick);
      if (analyser && input) {
        try {
          input.disconnect(analyser);
        } catch {
          // Already disconnected during teardown.
        }
      }
      if (
        typeof MediaStream !== 'undefined' &&
        source instanceof MediaStream
      ) {
        try {
          input?.disconnect();
        } catch {
          // Ignore teardown disconnect errors.
        }
      }
    };
  }, [source, variant, bars, mirror, barRadiusRatio]);

  return (
    <canvas
      ref={canvasRef}
      data-slot="visualizer"
      className={cn('block h-10 w-full', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    />
  );
}

export default Visualizer;
