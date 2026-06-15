export type ManualStatus = "uploaded" | "processing" | "ready" | "failed" | "archived";
export type ProductStatus = "active" | "archived";
export type SessionStatus = "active" | "resolved" | "escalated" | "abandoned";
export type SessionSeverity = "unknown" | "low" | "medium" | "high" | "critical";

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "support_agent" | "viewer";
  created_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  status: ProductStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ProductModel {
  id: string;
  product_id: string;
  model_number: string;
  display_name: string | null;
  release_year: number | null;
  status?: ProductStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Manual {
  id: string;
  company_id: string;
  product_id: string;
  product_model_id: string | null;
  title: string;
  version: string | null;
  language: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  status: ManualStatus;
  page_count: number | null;
  chunk_count: number;
  created_at: string;
  updated_at?: string;
}
