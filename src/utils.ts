let cachePromise: Promise<Cache> | undefined;
export function openCache(cacheName: string) {
  return (cachePromise ||= caches.open(cacheName));
}

const contentTypeByExt: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".txt": "text/plain",
  ".json": "application/json",
  ".xml": "application/xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

// it is guaranteed that the url does not follows '#' or '?'
export function contentType(url: string) {
  const filename = url.substring(url.lastIndexOf("/"));
  const ext = filename.substring(filename.lastIndexOf("."));
  return contentTypeByExt[ext] || "text/plain";
}

// prettier-ignore
export const urls = {
  layout: (baseUrl: string, uuid: string) =>
    `${baseUrl}/dynamicConvert/${uuid}/presentationML.zip`,
  share: (baseUrl: string, uuid: string) =>
    `${baseUrl}/dynamicConvert/${uuid}/share.json`,
  res: (baseUrl: string, uuid: string, slideId: number) =>
    `${baseUrl}/dynamicConvert/${uuid}/resources/resource${slideId}.zip`,
  shareRes: (baseUrl: string, name: string) =>
    `${baseUrl}/${name}`,
  entry: (baseUrl: string, uuid: string, filename: string) =>
    `${baseUrl}/dynamicConvert/${uuid}/${filename}`,
};
