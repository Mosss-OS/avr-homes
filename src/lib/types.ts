/**
 * Shared domain types for the AVR Homes app.
 *
 * Covers property data, agents, users, authentication, pagination, and
 * agent registration payloads.
 *
 * @module types
 */

/** The purpose or listing intent — buy, rent, or short-let. */
export type Purpose = "buy" | "rent" | "shortlet";
/** The physical type of the property. */
export type PropertyType = "apartment" | "villa" | "townhouse" | "penthouse" | "studio" | "land" | "commercial";
/** Supported display currencies. */
export type Currency = "NGN" | "USD" | "GBP";

/** Raw property data as returned by the API (snake_case fields). */
export interface PropertyData {
  id: number;
  title: string;
  slug: string;
  type: PropertyType;
  purpose: Purpose;
  price: number;
  nightly_price: number | null;
  min_stay: number;
  max_stay: number | null;
  beds: number;
  baths: number;
  area: number;
  city: string;
  community: string;
  address: string;
  lat: number;
  lng: number;
  image: string | null;
  video_url: string | null;
  videos?: PropertyVideo[];
  virtual_tour_url: string | null;
  floor_plan_url: string | null;
  description: string;
  amenities: string[];
  agent_id: number | null;
  featured: boolean;
  is_verified: boolean;
  is_off_plan: boolean;
  completion_date: string | null;
  posted_days_ago: number;
  images: PropertyImage[];
  agent_name?: string;
  agent_agency?: string;
  agent_phone?: string;
  agent_email?: string;
  agent_avatar_hue?: number;
  agent_languages?: string[];
  agent_is_verified?: boolean;
}

/** A video associated with a property (video gallery). */
export interface PropertyVideo {
  id: number;
  file_path: string;
  file_name: string;
  sort_order: number;
  url: string;
}

/** An image associated with a property. */
export interface PropertyImage {
  id: number;
  file_path: string;
  file_name: string;
  is_primary: boolean;
  sort_order: number;
  url: string;
}

/** Agent profile as returned by the API. */
export interface AgentData {
  id: number | string;
  name: string;
  agency: string;
  phone: string;
  email: string;
  languages: string[];
  listings: number;
  avatar_hue: number;
  is_verified?: boolean;
  properties?: PropertyData[];
}

/** Generic paginated API response wrapper. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Minimal agent profile embedded in user data. */
export interface AgentProfile {
  agent_id: number;
  slug: string | null;
  photo_url: string | null;
  agency: string;
  phone: string;
  is_verified: boolean;
  avatar_hue: number;
}

/** Authenticated user data (agent or admin). */
export interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  profile?: AgentProfile | null;
}

/** Authentication response payload containing tokens and user info. */
export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: UserData;
}

/** Payload for registering a new agent account. */
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  agency?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
  bio?: string;
  experience?: string;
  lasrera_number?: string;
  niesv_number?: string;
  avg_monthly_listings?: string;
  property_types?: string[];
  avg_deal_size?: string;
  specialization?: string[];
  social_instagram?: string;
  social_facebook?: string;
  social_linkedin?: string;
  social_tiktok?: string;
  social_youtube?: string;
  why_join?: string;
  referral_source?: string;
}
