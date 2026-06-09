import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";
import prop5 from "@/assets/prop-5.jpg";
import prop6 from "@/assets/prop-6.jpg";

export type Purpose = "buy" | "rent";
export type PropertyType = "apartment" | "villa" | "townhouse" | "penthouse" | "studio";

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  purpose: Purpose;
  price: number; // AED, per year if rent
  beds: number;
  baths: number;
  area: number; // sqft
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
    title: "Skyline Penthouse with Burj Khalifa Views",
    type: "penthouse", purpose: "buy", price: 12500000,
    beds: 4, baths: 5, area: 4200,
    city: "Dubai", community: "Downtown Dubai", address: "Burj Vista, Downtown",
    lat: 25.1972, lng: 55.2744,
    image: prop4, gallery: [prop4, prop1, prop2],
    description: "A rare full-floor penthouse with wraparound terraces, private elevator access, and uninterrupted views of the Burj Khalifa and Dubai Fountain.",
    amenities: ["Private pool", "Concierge", "Smart home", "Covered parking", "Gym"],
    agentId: "a-1", featured: true, verified: true, postedDaysAgo: 2,
  },
  {
    id: "p-102",
    title: "Beachfront Villa on Palm Jumeirah",
    type: "villa", purpose: "buy", price: 32000000,
    beds: 6, baths: 7, area: 9800,
    city: "Dubai", community: "Palm Jumeirah", address: "Frond M, Palm Jumeirah",
    lat: 25.1124, lng: 55.139,
    image: prop2, gallery: [prop2, prop6, prop1],
    description: "Signature waterfront villa with private beach access, infinity pool, and bespoke interiors by an award-winning studio.",
    amenities: ["Private beach", "Infinity pool", "Maid's room", "Driver's room", "Home cinema"],
    agentId: "a-2", featured: true, verified: true, postedDaysAgo: 5,
  },
  {
    id: "p-103",
    title: "Modern 2BR Apartment in Dubai Marina",
    type: "apartment", purpose: "rent", price: 165000,
    beds: 2, baths: 2, area: 1320,
    city: "Dubai", community: "Dubai Marina", address: "Marina Gate 1",
    lat: 25.0805, lng: 55.1403,
    image: prop1, gallery: [prop1, prop5, prop4],
    description: "Chic two-bedroom on a high floor with full marina views, modern kitchen, and access to a resort-style amenity deck.",
    amenities: ["Pool", "Gym", "24/7 security", "Parking", "Balcony"],
    agentId: "a-3", verified: true, postedDaysAgo: 1,
  },
  {
    id: "p-104",
    title: "Family Townhouse in Yas Island",
    type: "townhouse", purpose: "buy", price: 3850000,
    beds: 4, baths: 4, area: 2950,
    city: "Abu Dhabi", community: "Yas Acres", address: "The Cedars, Yas Acres",
    lat: 24.4672, lng: 54.6066,
    image: prop3, gallery: [prop3, prop1],
    description: "Bright family townhouse with private garden, double garage, and access to community pools, gym, and golf.",
    amenities: ["Garden", "Garage", "Community pool", "Golf access"],
    agentId: "a-1", verified: true, postedDaysAgo: 9,
  },
  {
    id: "p-105",
    title: "Cozy Studio in JBR",
    type: "studio", purpose: "rent", price: 72000,
    beds: 0, baths: 1, area: 480,
    city: "Dubai", community: "JBR", address: "Bahar 4, JBR",
    lat: 25.0782, lng: 55.1334,
    image: prop5, gallery: [prop5, prop1],
    description: "Fully furnished beach-walk studio, perfect for young professionals. Walking distance to The Walk and the tram.",
    amenities: ["Furnished", "Beach access", "Pool", "Gym"],
    agentId: "a-3", postedDaysAgo: 0,
  },
  {
    id: "p-106",
    title: "Cliffside Villa, Ras Al Khaimah",
    type: "villa", purpose: "buy", price: 7400000,
    beds: 5, baths: 6, area: 6100,
    city: "Ras Al Khaimah", community: "Al Hamra", address: "Marbella Bay",
    lat: 25.6896, lng: 55.7766,
    image: prop6, gallery: [prop6, prop2],
    description: "Mediterranean-inspired villa with infinity pool overlooking the Arabian Gulf and direct lagoon access.",
    amenities: ["Infinity pool", "Sea view", "Maid's room", "Boat mooring"],
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
  { id: "a-1", name: "Layla Hassan", agency: "Mirage Estates", phone: "+971 50 123 4567", email: "layla@mirage.ae", languages: ["English", "Arabic"], listings: 42, avatarHue: 195 },
  { id: "a-2", name: "Omar Al Falasi", agency: "Sandstone Realty", phone: "+971 55 987 6543", email: "omar@sandstone.ae", languages: ["English", "Arabic", "French"], listings: 28, avatarHue: 75 },
  { id: "a-3", name: "Priya Menon", agency: "Harbor Homes", phone: "+971 52 555 1212", email: "priya@harborhomes.ae", languages: ["English", "Hindi", "Malayalam"], listings: 36, avatarHue: 220 },
];

export const cities = ["Dubai", "Abu Dhabi", "Sharjah", "Ras Al Khaimah", "Ajman"];
export const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "penthouse", label: "Penthouse" },
  { value: "studio", label: "Studio" },
];

export function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n}`;
}

export function getProperty(id: string) {
  return properties.find((p) => p.id === id);
}
export function getAgent(id: string) {
  return agents.find((a) => a.id === id);
}
