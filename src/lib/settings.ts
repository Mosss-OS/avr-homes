import { api } from "./api-client";

export interface AppSettings {
  site_name: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  currency_ngn_usd: string;
  currency_ngn_gbp: string;
}

let cached: AppSettings | null = null;

export async function fetchSettings(): Promise<AppSettings> {
  try {
    const res = await api.get<{ data: AppSettings }>("/api/settings");
    cached = res.data.data;
    return cached;
  } catch {
    return {} as AppSettings;
  }
}

export function getCachedSettings(): AppSettings | null {
  return cached;
}

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
