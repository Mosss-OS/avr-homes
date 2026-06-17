import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";
import prop5 from "@/assets/prop-5.jpg";
import prop6 from "@/assets/prop-6.jpg";

export type Purpose = "buy" | "rent";
export type PropertyType = "apartment" | "villa" | "townhouse" | "penthouse" | "studio";
export type Currency = "NGN" | "USD" | "GBP";

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  purpose: Purpose;
  price: number; // NGN, per year if rent
  beds: number;
  baths: number;
  area: number; // sqm
  city: string;
  community: string;
  address: string;
  lat: number;
  lng: number;
  image: string;
  gallery: string[];
  description: string;
  amenities: string[];
  agentId: string;
  featured?: boolean;
  verified?: boolean;
  postedDaysAgo: number;
}

export const properties: Property[] = [
  {
    id: "p-101",
    title: "Skyline Penthouse with Lagos Lagoon Views",
    type: "penthouse", purpose: "buy", price: 950000000,
    beds: 4, baths: 5, area: 380,
    city: "Lagos", community: "Eko Atlantic", address: "Eko Pearl Towers, Eko Atlantic City",
    lat: 6.4204, lng: 3.4106,
    image: prop4, gallery: [prop4, prop1, prop2],
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
    image: prop2, gallery: [prop2, prop6, prop1],
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
    image: prop1, gallery: [prop1, prop5, prop4],
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
    image: prop3, gallery: [prop3, prop1],
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
    image: prop5, gallery: [prop5, prop1],
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
    image: prop6, gallery: [prop6, prop2],
    description: "Contemporary villa with private pool, tropical landscaping, smart home automation, and a full backup power system.",
    amenities: ["Private pool", "Smart home", "BQ", "Solar inverter", "CCTV"],
    agentId: "a-2", verified: true, postedDaysAgo: 14,
  },
];

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

export const agents: Agent[] = [
  { id: "a-1", name: "Adaeze Okafor", agency: "AVR Homes", phone: "+234 802 123 4567", email: "adaeze@avrhomes.ng", languages: ["English", "Igbo"], listings: 42, avatarHue: 195 },
  { id: "a-2", name: "Tunde Bakare", agency: "AVR Homes", phone: "+234 809 987 6543", email: "tunde@avrhomes.ng", languages: ["English", "Yoruba", "French"], listings: 28, avatarHue: 75 },
  { id: "a-3", name: "Zainab Mohammed", agency: "AVR Homes", phone: "+234 813 555 1212", email: "zainab@avrhomes.ng", languages: ["English", "Hausa"], listings: 36, avatarHue: 220 },
];

export const cities = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Benin City"];
export const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "penthouse", label: "Penthouse" },
  { value: "studio", label: "Studio" },
];

// Indicative FX (NGN-based). Update centrally when needed.
const RATES: Record<Currency, number> = { NGN: 1, USD: 1 / 1500, GBP: 1 / 1900 };
const SYMBOL: Record<Currency, string> = { NGN: "₦", USD: "$", GBP: "£" };

export function formatPrice(n: number, currency: Currency = "NGN"): string {
  const sym = SYMBOL[currency];
  const v = n * RATES[currency];
  if (v >= 1_000_000_000) return `${sym}${(v / 1_000_000_000).toFixed(v % 1_000_000_000 === 0 ? 0 : 2)}B`;
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 2)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}K`;
  return `${sym}${Math.round(v)}`;
}

// Back-compat alias used in older imports.
export const formatAED = (n: number) => formatPrice(n, "NGN");

export function getProperty(id: string) {
  return properties.find((p) => p.id === id);
}
export function getAgent(id: string) {
  return agents.find((a) => a.id === id);
}
