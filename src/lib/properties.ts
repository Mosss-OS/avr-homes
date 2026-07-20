/**
 * Property data layer — fetch functions, runtime types, static fallback data,
 * and formatting helpers.
 *
 * Combines API-driven property data (`PropertyData` → `Property` conversion)
 * with a large set of static fallback listings for the Lagos / Nigerian
 * real-estate market.
 *
 * @module properties
 */

import { api } from "./api-client";
import { getRate } from "./settings";
import type { PropertyData, AgentData, PaginatedResponse } from "./types";
import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";
import prop5 from "@/assets/prop-5.jpg";
import prop6 from "@/assets/prop-6.jpg";

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

/**
 * Static fallback property listings used for development / demo purposes
 * and as a content base when the API is unavailable.
 */
export const properties: Property[] = [
  {
    id: "p-101",
    title: "Skyline Penthouse with Lagos Lagoon Views",
    type: "penthouse", purpose: "buy", price: 950000000,
    beds: 4, baths: 5, area: 380,
    city: "Lagos", community: "Eko Atlantic", address: "Eko Pearl Towers, Eko Atlantic City",
    lat: 6.4204, lng: 3.4106,
    image: prop4, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop4, prop1, prop2],
    description: "A rare full-floor penthouse with wraparound terraces, private elevator access, and uninterrupted views of the Atlantic and Victoria Island skyline.",
    amenities: ["Private pool", "Concierge", "Smart home", "Covered parking", "Gym"],
    agentId: "a-1", featured: true, verified: true, postedDaysAgo: 2,
  },
  {
    id: "p-102",
    title: "Waterfront Mansion on Banana Island",
    type: "villa", purpose: "buy", price: 2800000000,
    beds: 6, baths: 7, area: 580,
    city: "Lagos", community: "Banana Island", address: "Block C, Banana Island, Ikoyi",
    lat: 6.4456, lng: 3.4459,
    image: prop2, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop2, prop6, prop1],
    description: "Signature waterfront mansion with private jetty access, infinity pool, and bespoke interiors by an award-winning Lagos studio.",
    amenities: ["Private jetty", "Infinity pool", "BQ", "Driver's quarters", "Home cinema"],
    agentId: "a-2", featured: true, verified: true, postedDaysAgo: 5,
  },
  {
    id: "p-103",
    title: "Modern 2BR Apartment in Lekki Phase 1",
    type: "apartment", purpose: "rent", price: 18000000,
    beds: 2, baths: 2, area: 110,
    city: "Lagos", community: "Lekki Phase 1", address: "Admiralty Way, Lekki Phase 1",
    lat: 6.4399, lng: 3.4716,
    image: prop1, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop1, prop5, prop4],
    description: "Chic two-bedroom on a high floor with skyline views, modern kitchen, and access to a resort-style amenity deck.",
    amenities: ["Pool", "Gym", "24/7 security", "Parking", "Balcony"],
    agentId: "a-3", verified: true, postedDaysAgo: 1,
  },
  {
    id: "p-104",
    title: "Family Townhouse in Ikoyi",
    type: "townhouse", purpose: "buy", price: 420000000,
    beds: 4, baths: 4, area: 180,
    city: "Lagos", community: "Old Ikoyi", address: "Bourdillon Road, Ikoyi",
    lat: 6.4488, lng: 3.4364,
    image: prop3, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop3, prop1],
    description: "Bright family townhouse with private garden, double garage, and access to a shared pool and 24/7 estate security.",
    amenities: ["Garden", "Garage", "Estate pool", "24/7 security"],
    agentId: "a-1", verified: true, postedDaysAgo: 9,
  },
  {
    id: "p-105",
    title: "Cozy Furnished Studio in Victoria Island",
    type: "studio", purpose: "rent", price: 7200000,
    beds: 0, baths: 1, area: 45,
    city: "Lagos", community: "Victoria Island", address: "Ozumba Mbadiwe Avenue, VI",
    lat: 6.4281, lng: 3.4219,
    image: prop5, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop5, prop1],
    description: "Fully furnished studio in the heart of VI — walking distance to offices, dining, and the lagoon waterfront.",
    amenities: ["Furnished", "Backup power", "Pool", "Gym"],
    agentId: "a-3", postedDaysAgo: 0,
  },
  {
    id: "p-106",
    title: "Luxury Detached Villa, Lekki Phase 2",
    type: "villa", purpose: "buy", price: 680000000,
    beds: 5, baths: 6, area: 520,
    city: "Lagos", community: "Lekki Phase 2", address: "Idado Estate, Igbo-efon, Lekki",
    lat: 6.4413, lng: 3.5234,
    image: prop6, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop6, prop2],
    description: "Contemporary villa with private pool, tropical landscaping, smart home automation, and a full backup power system.",
    amenities: ["Private pool", "Smart home", "BQ", "Solar inverter", "CCTV"],
    agentId: "a-2", verified: true, postedDaysAgo: 14,
  },
  // ---- Land listings across Nigeria ----
  {
    id: "l-201",
    title: "1,000sqm Dry Land — Lekki Phase 1", type: "land", purpose: "buy", price: 350000000,
    beds: 0, baths: 0, area: 1000,
    city: "Lagos", community: "Lekki Phase 1", address: "Freedom Way, Lekki Phase 1",
    lat: 6.4370, lng: 3.4700,
    image: prop3, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop3],
    description: "Prime residential plot with C of O in Lekki Phase 1 — dry, fenced, and ready to build.",
    amenities: ["C of O", "Fenced", "Dry land", "Motorable road"],
    agentId: "a-1", verified: true, postedDaysAgo: 3,
  },
  {
    id: "l-202",
    title: "5,000sqm Estate Land — Guzape, Abuja", type: "land", purpose: "buy", price: 850000000,
    beds: 0, baths: 0, area: 5000,
    city: "Abuja", community: "Guzape District", address: "Guzape Hills, Abuja",
    lat: 9.0579, lng: 7.5089,
    image: prop6, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop6],
    description: "Hillside plot in Abuja's most exclusive district with panoramic city views. R of O available.",
    amenities: ["R of O", "Serviced estate", "Tarred road", "Perimeter fencing"],
    agentId: "a-2", featured: true, verified: true, postedDaysAgo: 6,
  },
  {
    id: "l-203",
    title: "800sqm Waterfront Plot — Old GRA, Port Harcourt", type: "land", purpose: "buy", price: 180000000,
    beds: 0, baths: 0, area: 800,
    city: "Port Harcourt", community: "Old GRA", address: "Aba Road, Old GRA, Port Harcourt",
    lat: 4.8156, lng: 7.0498,
    image: prop2, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop2],
    description: "Rare waterfront residential plot in Old GRA with governor's consent.",
    amenities: ["Governor's Consent", "Waterfront", "Fenced"],
    agentId: "a-3", verified: true, postedDaysAgo: 10,
  },
  {
    id: "l-204",
    title: "2 Plots — Summit Estate, Asaba", type: "land", purpose: "buy", price: 45000000,
    beds: 0, baths: 0, area: 1200,
    city: "Asaba", community: "Summit Estate", address: "Summit Road, Asaba, Delta",
    lat: 6.2059, lng: 6.7275,
    image: prop4, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop4],
    description: "Twin plots in a fast-growing serviced estate close to Asaba International Airport.",
    amenities: ["C of O", "Estate infrastructure", "Gated community"],
    agentId: "a-1", postedDaysAgo: 14,
  },
  {
    id: "l-205",
    title: "1,500sqm Land — New Owerri, Imo", type: "land", purpose: "buy", price: 38000000,
    beds: 0, baths: 0, area: 1500,
    city: "Owerri", community: "New Owerri", address: "World Bank Housing Area, New Owerri",
    lat: 5.4840, lng: 7.0350,
    image: prop5, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop5],
    description: "Serene residential plot in New Owerri with excellent access roads and dry topography.",
    amenities: ["Registered survey", "Dry land", "Serviced area"],
    agentId: "a-2", postedDaysAgo: 8,
  },
  {
    id: "l-206",
    title: "1,000sqm Land — Awka Capital City Layout", type: "land", purpose: "buy", price: 32000000,
    beds: 0, baths: 0, area: 1000,
    city: "Awka", community: "Capital City Layout", address: "Enugu-Onitsha Expressway, Awka",
    lat: 6.2107, lng: 7.0722,
    image: prop1, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop1],
    description: "Government-approved layout plot in Anambra's state capital — perfect for family home or investment.",
    amenities: ["Governor's Consent", "Estate layout", "Motorable access"],
    agentId: "a-3", postedDaysAgo: 5,
  },
  // ---- Additional homes across Nigeria ----
  {
    id: "p-301",
    title: "4-Bed Duplex — Maitama, Abuja", type: "villa", purpose: "buy", price: 620000000,
    beds: 4, baths: 5, area: 340,
    city: "Abuja", community: "Maitama", address: "IBB Way, Maitama District",
    lat: 9.0898, lng: 7.4951,
    image: prop2, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop2, prop6],
    description: "Elegant contemporary duplex in Abuja's premier neighborhood — five minutes to the Villa.",
    amenities: ["BQ", "Solar backup", "CCTV", "Fitted kitchen"],
    agentId: "a-2", verified: true, featured: true, postedDaysAgo: 4,
  },
  // ---- Short-let / furnished rentals ----
  {
    id: "s-401",
    title: "Luxury 1BR Serviced Apartment — Eko Atlantic",
    type: "apartment", purpose: "shortlet", price: 350000, nightly_price: 350000, min_stay: 2, max_stay: 30,
    beds: 1, baths: 1, area: 65,
    city: "Lagos", community: "Eko Atlantic", address: "Eko Pearl Towers, Eko Atlantic City",
    lat: 6.4204, lng: 3.4106,
    image: prop4, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop4, prop1, prop2],
    description: "Fully furnished luxury apartment in Eko Atlantic with ocean views, concierge, and access to resort amenities.",
    amenities: ["Pool", "Gym", "Concierge", "Smart TV", "WiFi", "Fully equipped kitchen"],
    agentId: "a-1", featured: true, verified: true, postedDaysAgo: 1,
  },
  {
    id: "s-402",
    title: "Executive 2BR — Victoria Island, Lagos",
    type: "apartment", purpose: "shortlet", price: 280000, nightly_price: 280000, min_stay: 1, max_stay: 14,
    beds: 2, baths: 2, area: 100,
    city: "Lagos", community: "Victoria Island", address: "Ozumba Mbadiwe Avenue, VI",
    lat: 6.4281, lng: 3.4219,
    image: prop5, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop5, prop1],
    description: "Executive 2-bedroom in the heart of Victoria Island — walking distance to restaurants, banks, and the lagoon.",
    amenities: ["WiFi", "Backup power", "Pool", "Gym", "Fully furnished"],
    agentId: "a-3", verified: true, postedDaysAgo: 2,
  },
  {
    id: "s-403",
    title: "Penthouse Studio — Civic Towers, Lekki",
    type: "studio", purpose: "shortlet", price: 180000, nightly_price: 180000, min_stay: 1, max_stay: 7,
    beds: 0, baths: 1, area: 40,
    city: "Lagos", community: "Lekki Phase 1", address: "Civic Towers, Lekki Phase 1",
    lat: 6.4399, lng: 3.4716,
    image: prop1, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop1, prop5],
    description: "High-floor studio with panoramic skyline views, perfect for business travellers and short stays.",
    amenities: ["Pool", "Gym", "24/7 security", "WiFi", "Smart TV"],
    agentId: "a-2", postedDaysAgo: 0,
  },
  {
    id: "s-404",
    title: "3BR Villa — Banana Island Short-Let",
    type: "villa", purpose: "shortlet", price: 750000, nightly_price: 750000, min_stay: 3, max_stay: 21,
    beds: 3, baths: 4, area: 280,
    city: "Lagos", community: "Banana Island", address: "Block A, Banana Island, Ikoyi",
    lat: 6.4456, lng: 3.4459,
    image: prop2, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop2, prop6, prop1],
    description: "Exclusive 3-bedroom villa on Banana Island with private pool, jetty access, and full butler service.",
    amenities: ["Private pool", "Jetty access", "Butler service", "BQ", "Home cinema"],
    agentId: "a-1", featured: true, verified: true, postedDaysAgo: 5,
  },
  {
    id: "p-302",
    title: "3-Bed Serviced Apartment — GRA Phase 2, Port Harcourt", type: "apartment", purpose: "rent", price: 12000000,
    beds: 3, baths: 3, area: 140,
    city: "Port Harcourt", community: "GRA Phase 2", address: "Woji Road, GRA Phase 2",
    lat: 4.8320, lng: 7.0410,
    image: prop1, video_url: null, virtual_tour_url: null, floor_plan_url: null, gallery: [prop1, prop5],
    description: "Fully serviced apartment with 24/7 power, concierge, and pool access.",
    amenities: ["24/7 power", "Pool", "Gym", "Concierge"],
    agentId: "a-3", verified: true, postedDaysAgo: 2,
  },
];

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

/** Static fallback agent data. */
export const agents: Agent[] = [
  { id: "a-1", name: "Adaeze Okafor", agency: "AVR Homes", phone: "+234 802 123 4567", email: "adaeze@avrhomes.ng", languages: ["English", "Igbo"], listings: 42, avatarHue: 195 },
  { id: "a-2", name: "Tunde Bakare", agency: "AVR Homes", phone: "+234 809 987 6543", email: "tunde@avrhomes.ng", languages: ["English", "Yoruba", "French"], listings: 28, avatarHue: 75 },
  { id: "a-3", name: "Zainab Mohammed", agency: "AVR Homes", phone: "+234 813 555 1212", email: "zainab@avrhomes.ng", languages: ["English", "Hausa"], listings: 36, avatarHue: 220 },
];

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

/**
 * Looks up a static fallback property by its string ID.
 */
export function getProperty(id: string) {
  return properties.find((p) => p.id === id);
}
/**
 * Looks up a static fallback agent by their string ID.
 */
export function getAgent(id: string) {
  return agents.find((a) => a.id === id);
}
