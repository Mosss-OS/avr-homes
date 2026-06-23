export type Purpose = "buy" | "rent";
export type PropertyType = "apartment" | "villa" | "townhouse" | "penthouse" | "studio";
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
