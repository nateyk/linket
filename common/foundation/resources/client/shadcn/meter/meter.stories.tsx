import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from '@shadcn/meter/meter';
import preview from '@storybook/preview';

const meta = preview.meta({
  title: 'Meter',
  component: Meter,
  tags: ['autodocs'],
});

export const MeterExample = meta.story(() => {
  return (
    <Meter value={24}>
      <MeterLabel>Storage used</MeterLabel>
      <MeterValue />
      <MeterTrack>
        <MeterIndicator />
      </MeterTrack>
    </Meter>
  );
});
