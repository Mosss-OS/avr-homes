export type Purpose = "buy" | "rent";
export type PropertyType = "apartment" | "villa" | "townhouse" | "penthouse" | "studio" | "land" | "commercial";
export type Currency = "NGN" | "USD" | "GBP";

export interface PropertyData {
  id: number;
  title: string;
  slug: string;
  type: PropertyType;
  purpose: Purpose;
  price: number;
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
  virtual_tour_url: string | null;
  floor_plan_url: string | null;
  description: string;
  amenities: string[];
  agent_id: number | null;
  featured: boolean;
  is_verified: boolean;
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

export interface PropertyImage {
  id: number;
  file_path: string;
  file_name: string;
  is_primary: boolean;
  sort_order: number;
  url: string;
}

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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AgentProfile {
  agent_id: number;
  slug: string | null;
  photo_url: string | null;
  agency: string;
  phone: string;
  is_verified: boolean;
  avatar_hue: number;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  profile?: AgentProfile | null;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: UserData;
}

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
