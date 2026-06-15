export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface AuthUser {
  id: string;
  email: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMembership {
  id: string;
  company_id: string;
  user_id: string;
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
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface ProductModel {
  id: string;
  product_id: string;
  model_number: string;
  display_name: string | null;
  release_year: number | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
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
  storage_bucket: string;
  storage_path: string;
  checksum_sha256: string;
  status: "uploaded" | "processing" | "ready" | "failed" | "archived";
  page_count: number | null;
  chunk_count: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface IngestionJob {
  id: string;
  manual_id: string;
  company_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  current_step: string | null;
  error_message: string | null;
  chunks_created: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportSession {
  id: string;
  company_id: string;
  product_id: string | null;
  product_model_id: string | null;
  user_id: string | null;
  external_user_label: string | null;
  title: string | null;
  status: "active" | "resolved" | "escalated" | "abandoned";
  severity: "unknown" | "low" | "medium" | "high" | "critical";
  current_phase: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  content_type: "text" | "image" | "audio" | "tool_result" | "state_update";
  metadata: Json;
  created_at: string;
}

export interface SessionMedia {
  id: string;
  session_id: string;
  message_id: string | null;
  storage_bucket: string;
  storage_path: string;
  media_type: "image" | "audio" | "video" | "document";
  mime_type: string;
  file_size_bytes: number;
  transcript: string | null;
  vision_summary: string | null;
  metadata: Json;
  created_at: string;
}

export interface DiagnosticState {
  id: string;
  session_id: string;
  observed_symptoms: Json;
  known_context: Json;
  hypotheses: Json;
  eliminated_causes: Json;
  performed_steps: Json;
  recommended_next_step: Json | null;
  confidence: number;
  state_version: number;
  created_at: string;
  updated_at: string;
}

export interface ToolRun {
  id: string;
  session_id: string;
  message_id: string | null;
  tool_name: string;
  input: Json;
  output: Json | null;
  status: "running" | "completed" | "failed";
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface Escalation {
  id: string;
  session_id: string;
  company_id: string;
  assigned_to: string | null;
  reason: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "closed";
  created_at: string;
  closed_at: string | null;
}

export interface Feedback {
  id: string;
  session_id: string;
  user_id: string | null;
  rating: number | null;
  resolved: boolean | null;
  comment: string | null;
  created_at: string;
}

export interface StorageBucket {
  id: string;
  name: "manuals" | "session-media" | "company-assets";
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      companies: { Row: Company; Insert: Partial<Company>; Update: Partial<Company> };
      company_memberships: { Row: CompanyMembership; Insert: Partial<CompanyMembership>; Update: Partial<CompanyMembership> };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      product_models: { Row: ProductModel; Insert: Partial<ProductModel>; Update: Partial<ProductModel> };
      manuals: { Row: Manual; Insert: Partial<Manual>; Update: Partial<Manual> };
      ingestion_jobs: { Row: IngestionJob; Insert: Partial<IngestionJob>; Update: Partial<IngestionJob> };
      support_sessions: { Row: SupportSession; Insert: Partial<SupportSession>; Update: Partial<SupportSession> };
      session_messages: { Row: SessionMessage; Insert: Partial<SessionMessage>; Update: Partial<SessionMessage> };
      session_media: { Row: SessionMedia; Insert: Partial<SessionMedia>; Update: Partial<SessionMedia> };
      diagnostic_states: { Row: DiagnosticState; Insert: Partial<DiagnosticState>; Update: Partial<DiagnosticState> };
      tool_runs: { Row: ToolRun; Insert: Partial<ToolRun>; Update: Partial<ToolRun> };
      escalations: { Row: Escalation; Insert: Partial<Escalation>; Update: Partial<Escalation> };
      feedback: { Row: Feedback; Insert: Partial<Feedback>; Update: Partial<Feedback> };
    };
  };
  auth: {
    Tables: {
      users: { Row: AuthUser; Insert: Partial<AuthUser>; Update: Partial<AuthUser> };
    };
  };
  storage: {
    Tables: {
      buckets: { Row: StorageBucket; Insert: Partial<StorageBucket>; Update: Partial<StorageBucket> };
    };
  };
}
