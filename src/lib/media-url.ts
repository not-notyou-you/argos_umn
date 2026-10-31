export type MediaLike = {
  kind: 'image' | 'video';
  source: 'upload' | 'drive' | 'youtube';
  storageKey: string | null;
  externalId: string | null;
};

export function imageUrl(storageKey: string, width: 480 | 960 | 1600 = 960) {
  return `/media/images/${storageKey}-${width}.webp`;
}

export function imageSrcSet(storageKey: string) {
  return `${imageUrl(storageKey, 480)} 480w, ${imageUrl(storageKey, 960)} 960w, ${imageUrl(storageKey, 1600)} 1600w`;
}

export function videoFileUrl(storageKey: string) {
  return `/media/videos/${storageKey}`;
}

export function embedUrl(item: MediaLike): string | null {
  if (item.source === 'youtube' && item.externalId) {
    return `https://www.youtube-nocookie.com/embed/${item.externalId}?autoplay=1&rel=0`;
  }
  if (item.source === 'drive' && item.externalId) {
    return `https://drive.google.com/file/d/${item.externalId}/preview`;
  }
  return null;
}
