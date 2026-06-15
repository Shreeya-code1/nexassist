import type { DiagnosticState, EvidenceItem } from "./diagnostic";
import type { Company, CompanyMember, Manual, Product, ProductModel, SessionSeverity, SessionStatus } from "./product";

export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthResponse {
  status: "ok";
  version: string;
}

export interface CompanyListItem extends Pick<Company, "id" | "name" | "slug" | "logo_url"> {
  role: CompanyMember["role"];
}

export interface CompanyListResponse {
  companies: CompanyListItem[];
}

export interface CompanyCreateRequest {
  name: string;
  slug: string;
  website_url: string | null;
}

export interface CompanyCreateResponse {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
}

export interface CompanyDetailResponse extends Required<Company> {}

export interface CompanyUpdateRequest {
  name?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
}

export interface CompanyUpdateResponse extends Pick<Company, "id" | "name" | "slug" | "logo_url" | "website_url"> {
  updated_at: string;
}

export interface CompanyMembersResponse {
  members: CompanyMember[];
}

export interface CompanyMemberCreateRequest {
  email: string;
  role: "admin" | "support_agent" | "viewer";
}

export interface CompanyMemberCreateResponse {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyMember["role"];
}

export interface ProductListItem extends Omit<Product, "company_id" | "created_at" | "updated_at"> {
  model_count: number;
  manual_count: number;
}

export interface ProductListResponse {
  products: ProductListItem[];
}

export interface ProductCreateRequest {
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
}

export interface ProductCreateResponse {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  status: Product["status"];
}

export interface ProductDetailResponse extends Product {
  models: ProductModel[];
  manuals: Manual[];
}

export interface ProductUpdateRequest {
  name?: string | null;
  category?: string | null;
  description?: string | null;
  image_url?: string | null;
  status?: Product["status"] | null;
}

export interface ProductUpdateResponse {
  id: string;
  updated_at: string;
}

export interface ProductModelCreateRequest {
  model_number: string;
  display_name: string | null;
  release_year: number | null;
}

export interface ProductModelCreateResponse extends Pick<ProductModel, "id" | "product_id" | "model_number" | "display_name" | "release_year"> {}

export interface ProductManualsResponse {
  manuals: Manual[];
}

export interface ManualUploadResponse {
  manual_id: string;
  ingestion_job_id: string;
  status: Manual["status"];
}

export interface ManualDetailResponse extends Manual {}

export interface ManualDeleteResponse {
  deleted: boolean;
  manual_id: string;
}

export interface IngestionRunRequest {
  force_reindex: boolean;
}

export interface IngestionRunResponse {
  ingestion_job_id: string;
  manual_id: string;
  status: "queued";
}

export interface IngestionJobResponse {
  id: string;
  manual_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  current_step: string | null;
  chunks_created: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface SessionCreateRequest {
  company_id: string;
  product_id: string | null;
  product_model_id: string | null;
  external_user_label: string | null;
  initial_message: string | null;
}

export interface SessionCreateResponse {
  session_id: string;
  status: "active";
  current_phase: string;
}

export interface SessionListItem {
  id: string;
  title: string | null;
  status: SessionStatus;
  severity: SessionSeverity;
  current_phase: string;
  product_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionListResponse {
  sessions: SessionListItem[];
  total: number;
}

export interface SessionMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  content_type: "text" | "image" | "audio" | "tool_result" | "state_update";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SessionDetailResponse {
  id: string;
  company_id: string;
  product_id: string | null;
  product_model_id: string | null;
  status: SessionStatus;
  severity: SessionSeverity;
  current_phase: string;
  messages: SessionMessage[];
  diagnostic_state: DiagnosticState | Record<string, never>;
}

export interface MessageCreateRequest {
  content: string;
  content_type: "text";
  media_ids: string[];
}

export interface MessageCreateResponse {
  message_id: string;
  session_id: string;
  created_at: string;
}

export interface AgentRunRequest {
  session_id: string;
  message: string;
  media_ids: string[];
  stream: boolean;
}

export interface ToolRunItem {
  id?: string | null;
  tool_name: string | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | Record<string, unknown>[] | string | null;
  status: string | null;
  error_message: string | null;
  latency_ms: number | null;
}

export interface AgentRunResponse {
  session_id: string;
  assistant_message_id: string;
  answer: string;
  current_phase: string;
  diagnostic_state: DiagnosticState;
  evidence: EvidenceItem[];
  tool_runs: ToolRunItem[];
}

export interface AgentStreamRequest {
  session_id: string;
  message: string;
  media_ids: string[];
}

export interface AgentStreamResponse {
  type: "server_sent_events";
  events: string[];
}

export interface MediaUploadResponse {
  media_id: string;
  storage_path: string;
  media_type: "image" | "audio" | "video" | "document";
  mime_type: string;
}

export interface MediaTranscriptionResponse {
  media_id: string;
  transcript: string;
}

export interface ImageAnalyzeRequest {
  prompt: string | null;
}

export interface ImageAnalyzeResponse {
  media_id: string;
  vision_summary: string;
  detected_labels: string[];
}

export interface SessionResolveRequest {
  resolution_summary: string;
  final_cause: string | null;
}

export interface SessionResolveResponse {
  session_id: string;
  status: "resolved";
  resolved_at: string;
}

export interface SessionEscalateRequest {
  reason: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface SessionEscalateResponse {
  escalation_id: string;
  session_id: string;
  status: "open";
}

export interface FeedbackCreateRequest {
  session_id: string;
  rating: number | null;
  resolved: boolean | null;
  comment: string | null;
}

export interface FeedbackCreateResponse {
  id: string;
  session_id: string;
  created_at: string;
}
