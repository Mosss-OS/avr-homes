/**
 * General-purpose utility helpers.
 *
 * @module utils
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names, resolving conflicts via `tailwind-merge`
 * and filtering falsy values via `clsx`.
 *
 * @param inputs - Class values to merge (strings, objects, arrays, etc.).
 * @returns A single merged class name string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
