import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, waitFor} from 'storybook/test';
import {Starfield} from './auth-starfield';

const meta = {
  title: 'Auth/Starfield',
  component: Starfield,
} satisfies Meta<typeof Starfield>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InteractiveHero: Story = {
  render: () => (
    <div className="relative w-full max-w-3xl overflow-hidden rounded-card border border-border bg-muted/40">
      <Starfield
        className="absolute inset-0 pointer-events-none"
        color="var(--foreground)"
        hazeColors={['var(--primary)', 'var(--foreground)']}
        density={1.5}
        depth={0.9}
        glow={0.9}
        haze={0.38}
        intensity={1.15}
        warp={0.3}
      />
      <div className="relative z-10 flex min-h-[420px] max-w-lg flex-col justify-center px-12">
        <h2 className="text-4xl font-semibold text-foreground">
          A simpler way to sell what you create.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Create your storefront, share your links and manage your digital products in one place.
        </p>
      </div>
    </div>
  ),
  play: async ({canvasElement}) => {
    const root = canvasElement.querySelector('[data-slot="starfield"]') as HTMLElement;
    const canvas = root?.querySelector('canvas') as HTMLCanvasElement;
    await expect(root).toBeTruthy();
    await expect(canvas).toBeTruthy();

    // WebGL2 may be disabled on CI hardware. Unsupported environments must
    // fall back cleanly; available GPUs must compile and draw the real scene.
    const gpuAvailable = !!canvas.getContext('webgl2');
    await waitFor(() => {
      const state = root.dataset.state;
      if (gpuAvailable) {
        expect(['live', 'still']).toContain(state);
      } else {
        expect(state).toBe('unsupported');
      }
    }, {timeout: 5000});
  },
};
