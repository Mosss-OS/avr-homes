/**
 * ImageOptimizer — placeholder for server-side image compression.
 *
 * The browser already resizes/compresses images before upload (see
 * `src/lib/media-utils.ts`), and Cloudinary re-optimises on receipt, so the
 * legacy PHP-GD optimization step is intentionally a no-op here.
 *
 * @module server/image-optimizer
 */

export function optimize(buffer: Buffer): Buffer {
  return buffer;
}

export function isAvailable(): boolean {
  return false;
}
