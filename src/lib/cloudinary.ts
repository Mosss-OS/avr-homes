/**
 * Cloudinary URL helpers — append quality/format optimization params.
 */

const OPTIMIZED_PARAMS = 'f_auto,q_auto,w_800';

/**
 * Returns a Cloudinary-optimized image URL.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function optimizedImageUrl(url: string | null | undefined): string {
  if (!url || !url.includes('res.cloudinary.com')) return url ?? '';
  // Already has /upload/ — insert params after it
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/${OPTIMIZED_PARAMS}/${parts[1]}`;
}
