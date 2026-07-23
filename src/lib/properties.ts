/**
 * Property data layer — fetch functions, runtime types,
 * and formatting helpers.
 *
 * @module properties
 */

import { api } from "./api-client";
import { getRate } from "./settings";
import type { PropertyData, AgentData, PaginatedResponse } from "./types";

/** The purpose or listing intent (re-exported locally for convenience). */
export type Purpose = "buy" | "rent" | "shortlet";
/** The physical type of the property (re-exported locally for convenience). */
export type PropertyType = "apartment" | "villa" | "townhouse" | "penthouse" | "studio" | "land" | "commercial";
/** Supported display currencies (re-exported locally for convenience). */
export type Currency = "NGN" | "USD" | "GBP";

/**
 * Property shape used at runtime — works for both API data
 * (after propertyFromApi conversion) and legacy static fallback.
 */
export interface Property {
  id: string | number;
  title: string;
  type: PropertyType;
  purpose: Purpose;
  price: number;
  nightly_price?: number | null;
  min_stay?: number;
  max_stay?: number | null;
  beds: number;
  baths: number;
  area: number;
  city: string;
  community: string;
  address: string;
  lat: number;
  lng: number;
  image: any;
  video_url: string | null;
  videos?: { url: string; id?: number; file_name?: string }[];
  virtual_tour_url: string | null;
  floor_plan_url: string | null;
  gallery: string[];
  description: string;
  amenities: string[];
  agent_id?: string | number | null;
  agentId?: string;
  featured?: boolean;
  is_verified?: boolean;
  verified?: boolean;
  posted_days_ago?: number;
  postedDaysAgo?: number;
  images?: { url: string }[];
  agent_name?: string;
  agent_agency?: string;
  agent_phone?: string;
  agent_email?: string;
  agent_avatar_hue?: number;
  agent_languages?: string[];
  agent_is_verified?: boolean;
}

/**
 * Converts a raw API property object (`PropertyData`, snake_case) into the
 * runtime `Property` shape used by UI components.
 *
 * Normalises image, gallery, coordinates, and optional fields.
 */
export function propertyFromApi(p: PropertyData): Property {
  return {
    ...p,
    image: p.image || (p.images?.[0]?.url ?? null),
    video_url: p.video_url ?? null,
    virtual_tour_url: p.virtual_tour_url ?? null,
    floor_plan_url: p.floor_plan_url ?? null,
    gallery: p.images?.map((i) => i.url) || [],
    videos: p.videos,
    agent_id: p.agent_id ?? null,
    posted_days_ago: p.posted_days_ago ?? 0,
    postedDaysAgo: p.posted_days_ago ?? (p as any).post_days_ago ?? 0,
    nightly_price: p.nightly_price ?? null,
    min_stay: p.min_stay ?? 1,
    max_stay: p.max_stay ?? null,
    lat: Number(p.lat),
    lng: Number(p.lng),
  };
}

/**
 * Fetches a paginated, filtered list of properties from the API.
 * Results are normalised via `propertyFromApi`.
 *
 * @param params - Optional URL query parameters (e.g. `{ city: "Lagos", type: "villa" }`).
 */
export async function fetchProperties(params?: Record<string, string>): Promise<PaginatedResponse<Property>> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await api.get<PaginatedResponse<PropertyData>>(`/api/properties${qs}`);
  return {
    ...res.data,
    data: res.data.data.map(propertyFromApi),
  };
}

/**
 * Fetches a single property by its numeric ID and normalises it.
 */
export async function fetchProperty(id: number): Promise<Property> {
  const res = await api.get<PropertyData>(`/api/properties/${id}`);
  return propertyFromApi(res.data);
}

/**
 * Fetches the list of all agents from the API.
 */
export async function fetchAgents(): Promise<AgentData[]> {
  const res = await api.get<AgentData[]>("/api/agents");
  return res.data;
}

/**
 * Submits a contact form message to the API.
 */
export async function submitContact(data: Record<string, string>): Promise<void> {
  await api.post("/api/contact", data);
}

/**
 * Submits a property inquiry (lead) to the API.
 */
export async function submitInquiry(data: Record<string, string | number>): Promise<void> {
  await api.post("/api/inquiries", data);
}

/** A real-estate agent displayed in the UI. */
export interface Agent {
  id: string;
  name: string;
  agency: string;
  phone: string;
  email: string;
  languages: string[];
  listings: number;
  avatarHue: number;
}

/** List of cities used for property search filters. */
export const cities = ["Lagos", "Abuja", "Port Harcourt", "Asaba", "Owerri", "Awka", "Ibadan", "Benin City"];
/** List of Nigerian states / cities used in agent registration forms. */
export const nigerianStates = ["Lagos", "Abuja", "Port Harcourt", "Asaba", "Owerri", "Awka"];
/** Dropdown options for filtering by property type. */
export const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "penthouse", label: "Penthouse" },
  { value: "studio", label: "Studio" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

/** Dropdown options for filtering by purpose (buy / rent / short-let). */
export const purposes: { value: Purpose; label: string }[] = [
  { value: "buy", label: "Buy" },
  { value: "rent", label: "Rent" },
  { value: "shortlet", label: "Short-Let" },
];

/** Currency symbol lookup. */
const SYMBOL: Record<Currency, string> = { NGN: "₦", USD: "$", GBP: "£" };

/**
 * Formats a numeric NGN price as a human-readable string in the given
 * currency, using abbreviations for large values (B / M / K).
 *
 * @param n - Price in NGN.
 * @param currency - Target display currency.
 * @returns Formatted price string (e.g. `₦950M`, `$633K`).
 */
export function formatPrice(n: number, currency: Currency = "NGN"): string {
  const sym = SYMBOL[currency];
  const v = n * getRate(currency);
  if (v >= 1_000_000_000) return `${sym}${(v / 1_000_000_000).toFixed(v % 1_000_000_000 === 0 ? 0 : 2)}B`;
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 2)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}K`;
  return `${sym}${Math.round(v)}`;
}

/**
 * Formats a nightly price and appends "/night".
 */
export function formatNightlyPrice(n: number, currency: Currency = "NGN"): string {
  return `${formatPrice(n, currency)}/night`;
}

/**
 * Backward-compatible alias for `formatPrice(n, "NGN")`, used by older
 * import references.
 *
 * @deprecated Use `formatPrice(n, "NGN")` directly.
 */
export const formatAED = (n: number) => formatPrice(n, "NGN");
