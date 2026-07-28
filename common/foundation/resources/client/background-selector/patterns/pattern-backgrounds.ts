import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';

const front = 'var(--bg-pattern-front)';
const back = 'var(--bg-pattern-back)';
const size = 'var(--bg-pattern-size)';
const sizePx = (multiplier: number) => `calc(${size} * ${multiplier})`;
const frontAlpha = (opacity: number) =>
  `color-mix(in srgb, ${front} ${opacity}%, transparent)`;

export const patternBackgrounds: BackgroundSelectorConfig[] = [
  {
    backgroundImage: `linear-gradient(45deg, ${front} 50%, ${back} 50%)`,
  },
  {
    backgroundImage: `linear-gradient(-45deg, ${front} 50%, ${back} 50%)`,
  },
  {
    backgroundImage: `linear-gradient(0deg, ${front} 50%, ${back} 50%)`,
  },
  {
    backgroundImage: `linear-gradient(90deg, ${front} 50%, ${back} 50%)`,
  },
  {
    backgroundImage: `radial-gradient(${front} ${sizePx(0.25)}, ${back} ${sizePx(0.25)})`,
    backgroundSize: `${sizePx(2)} ${sizePx(2)}`,
  },
  {
    backgroundImage: `radial-gradient(${front} ${sizePx(0.25)}, transparent ${sizePx(0.25)}), radial-gradient(${front} ${sizePx(0.25)}, ${back} ${sizePx(0.25)})`,
    backgroundSize: `${sizePx(2)} ${sizePx(2)}`,
    backgroundPosition: `0 0, ${size} ${size}`,
  },
  {
    backgroundImage: `repeating-linear-gradient(45deg, ${front}, ${front} ${sizePx(0.25)}, ${back} ${sizePx(0.25)}, ${back} ${sizePx(2.5)})`,
  },
  {
    backgroundImage: `linear-gradient(${front} ${sizePx(0.2)}, transparent ${sizePx(0.2)}), linear-gradient(90deg, ${front} ${sizePx(0.2)}, transparent ${sizePx(0.2)}), linear-gradient(${front} ${sizePx(0.1)}, transparent ${sizePx(0.1)}), linear-gradient(90deg, ${front} ${sizePx(0.1)}, ${back} ${sizePx(0.1)})`,
    backgroundSize: `${sizePx(5)} ${sizePx(5)}, ${sizePx(5)} ${sizePx(5)}, ${size} ${size}, ${size} ${size}`,
    backgroundPosition: `${sizePx(-0.2)} ${sizePx(-0.2)}, ${sizePx(-0.2)} ${sizePx(-0.2)}, ${sizePx(-0.1)} ${sizePx(-0.1)}, ${sizePx(-0.1)} ${sizePx(-0.1)}`,
  },
  {
    backgroundImage: `linear-gradient(${front} ${sizePx(0.25)}, transparent ${sizePx(0.25)}), linear-gradient(to right, ${front} ${sizePx(0.25)}, ${back} ${sizePx(0.25)})`,
    backgroundSize: `${sizePx(2)} ${sizePx(2)}`,
  },
  {
    backgroundImage: `linear-gradient(0deg, ${back} 50%, ${front} 50%)`,
    backgroundSize: `${sizePx(2)} ${sizePx(2)}`,
  },
  {
    backgroundImage: `linear-gradient(to right, ${front}, ${front} ${size}, ${back} ${size}, ${back})`,
    backgroundSize: `${sizePx(2)} 100%`,
  },
  {
    backgroundImage: `linear-gradient(0deg, ${front}, ${front} ${sizePx(0.25)}, ${back} ${sizePx(0.25)}, ${back})`,
    backgroundSize: `${sizePx(2)} ${sizePx(2)}`,
  },
  {
    backgroundImage: `linear-gradient(to right, ${front}, ${front} ${sizePx(0.25)}, ${back} ${sizePx(0.25)}, ${back})`,
    backgroundSize: `${sizePx(2)} ${sizePx(2)}`,
  },
  {
    backgroundImage: `linear-gradient(135deg, ${front} 25%, transparent 25%), linear-gradient(225deg, ${front} 25%, transparent 25%), linear-gradient(45deg, ${front} 25%, transparent 25%), linear-gradient(315deg, ${front} 25%, ${back} 25%)`,
    backgroundPosition: `${sizePx(4)} 0, ${sizePx(4)} 0, 0 0, 0 0`,
    backgroundSize: `${sizePx(4)} ${sizePx(4)}`,
    backgroundRepeat: 'repeat',
  },
  {
    backgroundImage: `linear-gradient(135deg, ${front} 25%, transparent 25%), linear-gradient(225deg, ${front} 25%, transparent 25%), linear-gradient(45deg, ${front} 25%, transparent 25%), linear-gradient(315deg, ${front} 25%, ${back} 25%)`,
    backgroundPosition: `${sizePx(3)} 0, ${sizePx(3)} 0, 0 0, 0 0`,
    backgroundSize: `${sizePx(6)} ${sizePx(6)}`,
    backgroundRepeat: 'repeat',
  },
  {
    backgroundImage: `linear-gradient(135deg, ${frontAlpha(33)} 25%, transparent 25%), linear-gradient(225deg, ${front} 25%, transparent 25%), linear-gradient(315deg, ${frontAlpha(33)} 25%, transparent 25%), linear-gradient(45deg, ${front} 25%, ${back} 25%)`,
    backgroundPosition: `${sizePx(-1)} 0, ${sizePx(-1)} 0, 0 0, 0 0`,
    backgroundSize: `${sizePx(2)} ${sizePx(2)}`,
  },
  {
    backgroundImage: `linear-gradient(30deg, ${front} 12%, transparent 12.5%, transparent 87%, ${front} 87.5%, ${front}), linear-gradient(150deg, ${front} 12%, transparent 12.5%, transparent 87%, ${front} 87.5%, ${front}), linear-gradient(30deg, ${front} 12%, transparent 12.5%, transparent 87%, ${front} 87.5%, ${front}), linear-gradient(150deg, ${front} 12%, transparent 12.5%, transparent 87%, ${front} 87.5%, ${front}), linear-gradient(60deg, ${frontAlpha(47)} 25%, transparent 25.5%, transparent 75%, ${frontAlpha(47)} 75%, ${frontAlpha(47)}), linear-gradient(60deg, ${frontAlpha(47)} 25%, transparent 25.5%, transparent 75%, ${frontAlpha(47)} 75%, ${frontAlpha(47)}), linear-gradient(0deg, ${back}, ${back})`,
    backgroundSize: `${sizePx(4)} ${sizePx(7)}`,
    backgroundPosition: `0 0, 0 0, ${sizePx(2)} ${sizePx(3.5)}, ${sizePx(2)} ${sizePx(3.5)}, 0 0, ${sizePx(2)} ${sizePx(3.5)}`,
  },
  {
    backgroundImage: `linear-gradient(45deg, ${front} 50%, ${back} 50%)`,
    backgroundSize: `${sizePx(4)} ${sizePx(4)}`,
  },
  {
    backgroundImage: `repeating-linear-gradient(45deg, ${front} 25%, transparent 25%, transparent 75%, ${front} 75%, ${front}), repeating-linear-gradient(45deg, ${front} 25%, ${back} 25%, ${back} 75%, ${front} 75%, ${front})`,
    backgroundPosition: `0 0, ${sizePx(3)} ${sizePx(3)}`,
    backgroundSize: `${sizePx(6)} ${sizePx(6)}`,
  },
  {
    backgroundImage: `radial-gradient(circle, transparent 20%, ${back} 20%, ${back} 80%, transparent 80%, transparent), radial-gradient(circle, transparent 20%, ${back} 20%, ${back} 80%, transparent 80%, transparent), linear-gradient(${front} ${sizePx(
      0.2,
    )}, transparent ${sizePx(0.2)}), linear-gradient(90deg, ${front} ${sizePx(
      0.2,
    )}, ${back} ${sizePx(0.2)})`,
    backgroundPosition: `0 0, ${sizePx(2.5)} ${sizePx(2.5)}, 0 ${sizePx(
      -0.1,
    )}, ${sizePx(-0.1)} 0`,
    backgroundSize: `${sizePx(5)} ${sizePx(5)}, ${sizePx(5)} ${sizePx(
      5,
    )}, ${sizePx(2.5)} ${sizePx(2.5)}, ${sizePx(2.5)} ${sizePx(2.5)}`,
  },
];

export const patternColorPresets = [
  ['rgb(178, 163, 132)', 'rgb(246, 101, 78)'],
  ['rgb(71, 62, 51)', 'rgb(175, 123, 62)'],
  ['rgb(255, 229, 116)', 'rgb(255, 66, 78)'],
  ['rgb(115, 53, 13)', 'rgb(210, 204, 193)'],
  ['rgb(255, 147, 1)', 'rgb(255, 192, 1)'],
  ['rgb(216, 170, 49)', 'rgb(87, 48, 121)'],
  ['rgb(31, 30, 28)', 'rgb(237, 235, 27)'],
  ['rgb(219, 75, 96)', 'rgb(142, 223, 46)'],
  ['rgb(223, 114, 117)', 'rgb(56, 42, 81)'],
  ['rgb(136, 192, 220)', 'rgb(220, 222, 92)'],
  ['rgb(255, 252, 250)', 'rgb(185, 162, 107)'],
  ['rgb(216, 43, 73)', 'rgb(37, 149, 73)'],
  ['rgb(19, 36, 132)', 'rgb(43, 69, 237)'],
  ['rgb(108, 100, 89)', 'rgb(228, 217, 201)'],
  ['rgb(223, 154, 211)', 'rgb(85, 48, 150)'],
  ['rgb(207, 155, 194)', 'rgb(78, 15, 70)'],
  ['rgb(150, 242, 147)', 'rgb(54, 195, 84)'],
];
