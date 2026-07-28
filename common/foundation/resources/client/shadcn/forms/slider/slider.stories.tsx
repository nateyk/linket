import {Slider} from '@shadcn/forms/slider/slider';
import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';

const meta = preview.meta({
  title: 'Slider',
  component: Slider,
  tags: ['autodocs'],
});

export const Default = meta.story({
  render: () => (
    <div className="w-full max-w-sm">
      <Slider.Root defaultValue={50} min={0} max={100}>
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb aria-label="Value" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  ),
});

export const Range = meta.story({
  render: () => (
    <div className="w-full max-w-sm">
      <Slider.Root
        defaultValue={[20, 80]}
        min={0}
        max={100}
        minStepsBetweenValues={1}
      >
        <Slider.Label>
          <Trans message="Price range" />
        </Slider.Label>
        <Slider.Value className="col-start-2 text-end" />
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb index={0} aria-label="Minimum" />
            <Slider.Thumb index={1} aria-label="Maximum" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  ),
});

export const Vertical = meta.story({
  render: () => (
    <div className="w-full max-w-sm">
      <Slider.Root
        orientation="vertical"
        defaultValue={50}
        min={0}
        max={100}
        className="h-56"
      >
        <Slider.Label>
          <Trans message="Volume" />
        </Slider.Label>
        <Slider.Value className="col-start-2 text-end" />
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb aria-label="Volume" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  ),
});

export const Disabled = meta.story({
  render: () => (
    <div className="w-full max-w-sm">
      <Slider.Root defaultValue={40} min={0} max={100} disabled>
        <Slider.Label>
          <Trans message="Level" />
        </Slider.Label>
        <Slider.Value className="col-start-2 text-end" />
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb aria-label="Level" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  ),
});

export const Rtl = meta.story({
  render: () => (
    <div className="w-full max-w-sm">
      <Slider.Root defaultValue={50} min={0} max={100}>
        <Slider.Label>
          <Trans message="Brightness" />
        </Slider.Label>
        <Slider.Value className="col-start-2 text-end" />
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb aria-label="Brightness" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  ),
});
