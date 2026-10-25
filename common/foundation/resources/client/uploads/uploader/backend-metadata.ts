export interface BackendMetadata {
  relativePath?: string | null;
  [key: string]: number | string | null | undefined;
}

/** BeDesk-compatible disk hint for upload metadata. */
export enum Disk {
  public = 'public',
  uploads = 'uploads',
}
