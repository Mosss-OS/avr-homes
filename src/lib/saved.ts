// Tiny localStorage helpers for saved properties + searches (frontend only for now)
const SAVED_PROPS = "uae-saved-props";
const SAVED_SEARCHES = "uae-saved-searches";

export interface SavedSearch {
  id: string;
  name: string;
  query: string; // serialized search string
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

export function getSavedProps(): string[] { return read<string[]>(SAVED_PROPS, []); }
export function toggleSavedProp(id: string): string[] {
  const list = getSavedProps();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  write(SAVED_PROPS, next);
  return next;
}
export function isSaved(id: string): boolean { return getSavedProps().includes(id); }

export function getSavedSearches(): SavedSearch[] { return read<SavedSearch[]>(SAVED_SEARCHES, []); }
export function addSavedSearch(s: Omit<SavedSearch, "id" | "createdAt">): SavedSearch[] {
  const list = getSavedSearches();
  const next = [...list, { ...s, id: crypto.randomUUID(), createdAt: Date.now() }];
  write(SAVED_SEARCHES, next);
  return next;
}
export function removeSavedSearch(id: string): SavedSearch[] {
  const next = getSavedSearches().filter((s) => s.id !== id);
  write(SAVED_SEARCHES, next);
  return next;
}
