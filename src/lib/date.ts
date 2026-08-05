/**
 * Date formatting helpers.
 *
 * @module date
 */

/**
 * Formats an API datetime string ("YYYY-MM-DD HH:MM:SS") as a friendly
 * human date (e.g. "3 June 2025"). Falls back to the raw input if it
 * cannot be parsed.
 */
export function formatPostDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
