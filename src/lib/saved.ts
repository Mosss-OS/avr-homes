/**
 * Client-side persistence for saved properties and saved searches.
 *
 * All data is stored in `localStorage` under prefixed keys.
 * These helpers are frontend-only (server-side / SSR returns
 * empty fallback arrays).
 *
 * @module saved
 */

/** localStorage key for the saved-property IDs list. */
const SAVED_PROPS = "uae-saved-props";
/** localStorage key for the saved-search entries list. */
const SAVED_SEARCHES = "uae-saved-searches";

/** A persisted search filter that the user can re-run or enable alerts on. */
export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  alert_enabled: boolean;
  createdAt: number;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Returns the list of saved property IDs.
 */
export function getSavedProps(): string[] { return read<string[]>(SAVED_PROPS, []); }

/**
 * Toggles a property ID in the saved set — adds it if absent, removes it if
 * present. Returns the updated list.
 */
export function toggleSavedProp(id: string): string[] {
  const list = getSavedProps();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  write(SAVED_PROPS, next);
  return next;
}

/**
 * Checks whether a given property ID is currently saved.
 */
export function isSaved(id: string): boolean { return getSavedProps().includes(id); }

/**
 * Returns all saved search entries.
 */
export function getSavedSearches(): SavedSearch[] { return read<SavedSearch[]>(SAVED_SEARCHES, []); }

/**
 * Adds a new saved search entry (ID, `createdAt`, and `alert_enabled` are
 * auto-generated). Returns the updated list.
 */
export function addSavedSearch(s: Omit<SavedSearch, "id" | "createdAt" | "alert_enabled">): SavedSearch[] {
  const list = getSavedSearches();
  const next = [...list, { ...s, alert_enabled: true, id: crypto.randomUUID(), createdAt: Date.now() }];
  write(SAVED_SEARCHES, next);
  return next;
}

/**
 * Removes a saved search entry by its ID. Returns the updated list.
 */
export function removeSavedSearch(id: string): SavedSearch[] {
  const next = getSavedSearches().filter((s) => s.id !== id);
  write(SAVED_SEARCHES, next);
  return next;
}

/**
 * Toggles the `alert_enabled` flag on a saved search entry by ID.
 * Returns the updated list.
 */
export function toggleSearchAlert(id: string): SavedSearch[] {
  const next = getSavedSearches().map((s) =>
    s.id === id ? { ...s, alert_enabled: !s.alert_enabled } : s
  );
  write(SAVED_SEARCHES, next);
  return next;
}
