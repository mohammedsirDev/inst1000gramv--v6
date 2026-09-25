declare module 'cakkatrok-instagram-downloader' {
  const SnapVideo: any;
  export default SnapVideo;
}

declare module 'instagram-url-direct' {
  export const instagramGetUrl: (url: string) => Promise<any>;
}

declare module '@jerrycoder/instagram-api' {
  export const instagram: (url: string) => Promise<any>;
}

declare module 'snapsave-media-downloader' {
  export const snapsave: (url: string) => Promise<any>;
}

declare module 'btch-downloader' {
  export const igdl: (url: string) => Promise<any>;
  export const aio: (url: string) => Promise<any>;
}
