export type GradientWallpaper = {
  src: string;
};

export const Gradients: GradientWallpaper[] = Array.from(
  {length: 26},
  (_, index) => ({
    src: `images/wallpapers/gradients/mesh-gradient-${index + 1}.webp`,
  }),
);
