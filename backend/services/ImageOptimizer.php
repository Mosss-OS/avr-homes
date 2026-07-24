<?php

declare(strict_types=1);

/**
 * ImageOptimizer — compress and resize images before upload.
 *
 * Uses PHP GD with graceful fallback if GD is not available.
 * Target: max 1920px on the longest side, JPEG quality 82%.
 */
class ImageOptimizer
{
  private const MAX_WIDTH  = 1920;
  private const MAX_HEIGHT = 1920;
  private const JPEG_QUALITY = 82;

  /**
   * Optimize an image file in-place. Returns the (possibly new) file path.
   * The caller should clean up the returned path when it differs from the original.
   *
   * @param string $filePath Absolute path to the image file.
   * @return string Path to the optimised file (may be the same as $filePath).
   */
  public static function optimize(string $filePath): string
  {
    if (!function_exists('imagecreatefromjpeg') || !function_exists('imagecreatefrompng')) {
      return $filePath;
    }

    $info = @getimagesize($filePath);
    if (!$info) {
      return $filePath;
    }

    $mime = $info['mime'];
    $srcW = $info[0];
    $srcH = $info[1];

    // Only optimise raster images
    $src = match ($mime) {
      'image/jpeg' => @imagecreatefromjpeg($filePath),
      'image/png'  => @imagecreatefrompng($filePath),
      'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($filePath) : false,
      default      => false,
    };

    if (!$src) {
      return $filePath;
    }

    // Calculate new dimensions
    $newW = $srcW;
    $newH = $srcH;
    if ($srcW > self::MAX_WIDTH || $srcH > self::MAX_HEIGHT) {
      $ratio = min(self::MAX_WIDTH / $srcW, self::MAX_HEIGHT / $srcH);
      $newW = (int)round($srcW * $ratio);
      $newH = (int)round($srcH * $ratio);
    }

    $dst = imagecreatetruecolor($newW, $newH);
    if (!$dst) {
      imagedestroy($src);
      return $filePath;
    }

    // Preserve transparency for PNGs
    if ($mime === 'image/png') {
      imagealphablending($dst, false);
      imagesavealpha($dst, true);
      $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
      imagefilledrectangle($dst, 0, 0, $newW, $newH, $transparent);
    }

    imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $srcW, $srcH);

    // Save to a temp file
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);
    $outPath = $filePath . '_opt.' . ($ext ?: 'jpg');

    $saved = match ($mime) {
      'image/jpeg' => imagejpeg($dst, $outPath, self::JPEG_QUALITY),
      'image/png'  => imagepng($dst, $outPath, 6), // compression level 6
      'image/webp' => function_exists('imagewebp') ? imagewebp($dst, $outPath, 85) : false,
      default      => false,
    };

    imagedestroy($src);
    imagedestroy($dst);

    if ($saved && file_exists($outPath) && filesize($outPath) > 0) {
      // Only use the optimised file if it's actually smaller
      if (filesize($outPath) < filesize($filePath)) {
        @unlink($filePath);
        return $outPath;
      }
      @unlink($outPath);
    }

    return $filePath;
  }

  /**
   * Check if image optimisation is supported on this server.
   */
  public static function isAvailable(): bool
  {
    return function_exists('imagecreatefromjpeg') && function_exists('imagecreatefrompng');
  }
}
