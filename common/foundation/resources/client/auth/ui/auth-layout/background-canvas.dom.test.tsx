/** @vitest-environment jsdom */
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {Starfield} from './auth-starfield';

const frameCallbacks = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
let mediaHandlers: Array<(event: MediaQueryListEvent) => void> = [];
let reduced = false;

function mockGL() {
  const gl = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    COLOR_BUFFER_BIT: 16384,
    TRIANGLES: 4,
    createShader: vi.fn(() => ({id: 'shader'})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({id: 'program'})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    createVertexArray: vi.fn(() => ({id: 'vao'})),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),
    useProgram: vi.fn(),
    getUniformLocation: vi.fn((_program: unknown, name: string) => ({name})),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform3fv: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays: vi.fn(),
    deleteProgram: vi.fn(),
  };
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: vi.fn(() => gl),
  });
  return gl;
}

beforeEach(() => {
  frameCallbacks.clear();
  nextFrame = 0;
  reduced = false;
  mediaHandlers = [];
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    const id = ++nextFrame;
    frameCallbacks.set(id, callback as FrameRequestCallback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn(id => {
    frameCallbacks.delete(id as number);
  }));
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return reduced; },
    addEventListener: (_event: string, fn: (event: MediaQueryListEvent) => void) => {
      mediaHandlers.push(fn);
    },
    removeEventListener: (_event: string, fn: (event: MediaQueryListEvent) => void) => {
      mediaHandlers = mediaHandlers.filter(entry => entry !== fn);
    },
  })));
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({
      x: 0, y: 0, left: 0, top: 0, width: 640, height: 420,
      right: 640, bottom: 420, toJSON: () => ({}),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  frameCallbacks.clear();
});

function drawNextFrame() {
  const entry = frameCallbacks.entries().next().value;
  expect(entry).toBeTruthy();
  const [id, callback] = entry!;
  frameCallbacks.delete(id);
  act(() => callback(performance.now() + 800));
}

test('WebGL2 shader renders a live canvas with uniforms and disposes on unmount', () => {
  const gl = mockGL();
  const {container, unmount} = render(
    <Starfield
      density={1.5}
      depth={0.9}
      glow={0.9}
      hazeColors={['#0049CC', '#006BE4', '#0097CC', '#00B585']}
      starColors={['#0049CC', '#0092F6', '#00CBE9', '#00A7AA']}
      warp={0.3}
      interactive
    />,
  );
  const root = container.querySelector('[data-slot="starfield"]') as HTMLElement;
  expect(root).toBeTruthy();
  expect(root.dataset.state).toBe('loading');
  expect(gl.shaderSource).toHaveBeenCalledTimes(2);
  expect(String(gl.shaderSource.mock.calls[1][1])).toContain('uPointer');
  expect(String(gl.shaderSource.mock.calls[1][1])).toContain('for (int l = 0; l < 5; l++)');
  drawNextFrame();
  expect(root.dataset.state).toBe('live');
  expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, 3);
  expect(gl.viewport).toHaveBeenCalled();
  expect(gl.uniform2f).toHaveBeenCalled();
  expect(gl.uniform3fv).toHaveBeenCalled();
  const starPalette = gl.uniform3fv.mock.calls.find(
    call => call[0]?.name === 'uStarColors[0]',
  )?.[1] as Float32Array | undefined;
  expect(starPalette).toBeInstanceOf(Float32Array);
  expect(starPalette?.length).toBe(12);
  expect(starPalette?.[0]).toBeCloseTo(0);
  expect(starPalette?.[1]).toBeCloseTo(73 / 255);
  expect(starPalette?.[2]).toBeCloseTo(204 / 255);
  expect(starPalette?.[10]).toBeCloseTo(167 / 255);
  expect(gl.uniform1i.mock.calls).toContainEqual([
    {name: 'uStarColorsCount'}, 4,
  ]);
  expect(gl.uniform1f.mock.calls.some(call => call[0]?.name === 'uWarp' && call[1] === 0.3)).toBe(true);
  unmount();
  expect(gl.deleteProgram).toHaveBeenCalled();
  expect(gl.deleteVertexArray).toHaveBeenCalled();
  expect(frameCallbacks.size).toBe(0);
});

test('pointer movement reaches the GPU without making the decoration intercept UI', () => {
  const gl = mockGL();
  const {container} = render(<Starfield interactive />);
  const root = container.querySelector('[data-slot="starfield"]') as HTMLElement;
  expect(root.className).toContain('group/background');
  drawNextFrame();
  fireEvent.pointerMove(window, {clientX: 210, clientY: 180});
  drawNextFrame();
  const values = gl.uniform3f.mock.calls.filter(call => call[0]?.name === 'uPointer');
  const last = values.at(-1);
  expect(last).toBeTruthy();
  expect(last![1]).toBeGreaterThan(0);
  expect(last![2]).toBeGreaterThan(0);
  expect(last![3]).toBeGreaterThan(0);
});

test('reduced motion freezes on one frame with pointer interaction disabled', () => {
  reduced = true;
  const gl = mockGL();
  const {container} = render(<Starfield interactive />);
  drawNextFrame();
  expect((container.querySelector('[data-slot="starfield"]') as HTMLElement).dataset.state).toBe('still');
  expect(frameCallbacks.size).toBe(0);
  const currentPointerCalls = gl.uniform3f.mock.calls.length;
  fireEvent.pointerMove(window, {clientX: 200, clientY: 150});
  expect(gl.uniform3f.mock.calls.length).toBe(currentPointerCalls);
  expect(mediaHandlers.length).toBeGreaterThan(0);
});

test('WebGL shader compilation failure is nonfatal and retains static fallback', () => {
  const gl = mockGL();
  gl.getShaderParameter.mockReturnValue(false);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const {container} = render(<Starfield />);
  const root = container.querySelector('[data-slot="starfield"]') as HTMLElement;
  expect(root.dataset.state).toBe('unsupported');
  expect(root.querySelector('[data-slot="background-canvas-fallback"]')).toBeTruthy();
  expect(gl.deleteShader).toHaveBeenCalled();
  expect(gl.drawArrays).not.toHaveBeenCalled();
});
