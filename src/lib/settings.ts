/**
 * Application settings — fetched from the API and cached for the session.
 * Provides currency conversion rates based on cached settings.
 *
 * @module settings
 */

import { api } from "./api-client";

/** Global application settings returned by the /api/settings endpoint. */
export interface AppSettings {
  site_name: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  currency_ngn_usd: string;
  currency_ngn_gbp: string;
}

let cached: AppSettings | null = null;

/**
 * Fetches application settings from the API and caches them in memory.
 * Returns an empty object cast to `AppSettings` on failure.
 */
export async function fetchSettings(): Promise<AppSettings> {
  try {
    const res = await api.get<{ data: AppSettings }>("/api/settings");
    cached = res.data.data;
    return cached;
  } catch {
    return {} as AppSettings;
  }
}

/**
 * Returns the currently cached settings object, or `null` if not yet fetched.
 */
export function getCachedSettings(): AppSettings | null {
  return cached;
}

/**
 * Converts a price in NGN to the given display currency using cached
 * exchange rates (or hardcoded fallbacks if settings have not loaded).
 *
 * @param currency - Target currency code.
 * @returns The multiplier to convert NGN → target currency.
 */
export function getRate(currency: "NGN" | "USD" | "GBP"): number {
  if (!cached) {
    const FALLBACK = { NGN: 1, USD: 1 / 1500, GBP: 1 / 1900 };
    return FALLBACK[currency];
  }
  const rates: Record<string, number> = {
    NGN: 1,
    USD: parseFloat(cached.currency_ngn_usd) || 1 / 1500,
    GBP: parseFloat(cached.currency_ngn_gbp) || 1 / 1900,
  };
  return rates[currency];
}
