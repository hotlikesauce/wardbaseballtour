import { getImage } from 'astro:assets';
import type { Photo } from './journey';

/** Full-screen version for the lightbox: long edge capped at 2000px, WebP. */
export async function lightboxSrc(p: Photo): Promise<string> {
  const longEdge = Math.min(2000, Math.max(p.img.width, p.img.height));
  const width = p.ratio >= 1 ? longEdge : Math.round(longEdge * p.ratio);
  const out = await getImage({ src: p.img, width: Math.min(width, p.img.width), format: 'webp', quality: 80 });
  return out.src;
}
