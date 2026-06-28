export interface ResolvedTrack {
  url: string;
  platform: string;
  title?: string;
  id?: string;
}

export type PlatformResolver = (query: string) => Promise<ResolvedTrack>;
