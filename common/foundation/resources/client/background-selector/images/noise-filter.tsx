export function NoiseFilter() {
  return (
    <svg aria-hidden="true" className="hidden">
      <defs>
        <filter
          id="noiseFilter"
          filterUnits="objectBoundingBox"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            result="noise"
          />
          <feColorMatrix
            type="saturate"
            values="0"
            in="noise"
            result="desaturatedNoise"
          />
          <feComponentTransfer in="desaturatedNoise" result="subtleNoise">
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feBlend mode="overlay" in="subtleNoise" in2="SourceGraphic" />
        </filter>
      </defs>
    </svg>
  );
}
