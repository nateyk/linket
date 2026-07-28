export interface FontConfig {
  family: string;
  google?: boolean;
}

export interface FontFaceConfig {
  family: string;
  src: string;
  descriptors?: FontFaceDescriptors;
}
