import { API_BASE_URL } from "@/lib/constants";
import type { AgentRunRequest, AgentRunResponse, ApiError, CompanyCreateRequest, CompanyCreateResponse, CompanyListResponse, FeedbackCreateRequest, FeedbackCreateResponse, ImageAnalyzeRequest, ImageAnalyzeResponse, IngestionJobResponse, IngestionRunResponse, ManualUploadResponse, MediaTranscriptionResponse, MediaUploadResponse, ProductCreateRequest, ProductCreateResponse, ProductListResponse, SessionCreateRequest, SessionCreateResponse, SessionDetailResponse, SessionEscalateRequest, SessionEscalateResponse, SessionListResponse, SessionResolveRequest, SessionResolveResponse } from "@/lib/types/api";


type QueryPrimitive = string | number | boolean | null | undefined;

export interface UploadManualParams {
  company_id: string;
  product_id: string;
  product_model_id?: string | null;
  title: string;
  version?: string | null;
  language: string;
  file: File;
}

export interface UploadMediaParams {
  session_id: string;
  media_type: "image" | "audio" | "video" | "document";
  file: File;
}

export interface SessionListParams {
  company_id: string;
  status?: string | null;
  product_id?: string | null;
  limit?: number;
  offset?: number;
}

function query(params: object): string {
  const search = new URLSearchParams();
  (Object.entries(params) as [string, QueryPrimitive][]).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      search.set(key, String(value));
    }
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

function jsonHeaders(init: RequestInit | undefined, token: string | undefined, isFormData: boolean): Headers {
  const headers = new Headers(init?.headers);
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function apiFetch<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: jsonHeaders(init, token, isFormData)
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Network request failed";
    throw new Error(`Unable to reach API at ${API_BASE_URL}: ${message}`);
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({ detail: response.statusText }))) as ApiError;
    throw new Error(error.detail);
  }
  return (await response.json()) as T;
}

export function getCompanies(token: string): Promise<CompanyListResponse> {
  return apiFetch<CompanyListResponse>("/api/v1/companies/", undefined, token);
}

export function createCompany(payload: CompanyCreateRequest, token: string): Promise<CompanyCreateResponse> {
  return apiFetch<CompanyCreateResponse>("/api/v1/companies/", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function getProducts(companyId: string, token: string): Promise<ProductListResponse> {
  return apiFetch<ProductListResponse>(`/api/v1/products/companies/${companyId}/products`, undefined, token);
}

export function createProduct(companyId: string, payload: ProductCreateRequest, token: string): Promise<ProductCreateResponse> {
  return apiFetch<ProductCreateResponse>(`/api/v1/products/companies/${companyId}/products`, { method: "POST", body: JSON.stringify(payload) }, token);
}

export function uploadManual(params: UploadManualParams, token: string): Promise<ManualUploadResponse> {
  const formData = new FormData();
  formData.set("company_id", params.company_id);
  formData.set("product_id", params.product_id);
  if (params.product_model_id) formData.set("product_model_id", params.product_model_id);
  formData.set("title", params.title);
  if (params.version) formData.set("version", params.version);
  formData.set("language", params.language);
  formData.set("file", params.file);
  return apiFetch<ManualUploadResponse>("/api/v1/manuals/upload", { method: "POST", body: formData }, token);
}

export function runIngestion(manualId: string, forceReindex: boolean, token: string): Promise<IngestionRunResponse> {
  return apiFetch<IngestionRunResponse>(`/api/v1/ingestion/${manualId}/run`, { method: "POST", body: JSON.stringify({ force_reindex: forceReindex }) }, token);
}

export function getIngestionJob(jobId: string, token: string): Promise<IngestionJobResponse> {
  return apiFetch<IngestionJobResponse>(`/api/v1/ingestion/jobs/${jobId}`, undefined, token);
}

export function createSession(payload: SessionCreateRequest, token: string): Promise<SessionCreateResponse> {
  return apiFetch<SessionCreateResponse>("/api/v1/sessions/", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function getSessions(params: SessionListParams, token: string): Promise<SessionListResponse> {
  return apiFetch<SessionListResponse>(`/api/v1/sessions/${query(params)}`, undefined, token);
}

export function getSession(sessionId: string, token: string): Promise<SessionDetailResponse> {
  return apiFetch<SessionDetailResponse>(`/api/v1/sessions/${sessionId}`, undefined, token);
}

export function runAgent(payload: AgentRunRequest, token: string): Promise<AgentRunResponse> {
  return apiFetch<AgentRunResponse>("/api/v1/agent/run", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function uploadMedia(params: UploadMediaParams, token: string): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.set("session_id", params.session_id);
  formData.set("media_type", params.media_type);
  formData.set("file", params.file);
  return apiFetch<MediaUploadResponse>("/api/v1/media/upload", { method: "POST", body: formData }, token);
}

export function transcribeMedia(mediaId: string, token: string): Promise<MediaTranscriptionResponse> {
  return apiFetch<MediaTranscriptionResponse>(`/api/v1/media/${mediaId}/transcribe`, { method: "POST" }, token);
}

export function analyzeMedia(mediaId: string, payload: ImageAnalyzeRequest, token: string): Promise<ImageAnalyzeResponse> {
  return apiFetch<ImageAnalyzeResponse>(`/api/v1/media/${mediaId}/analyze-image`, { method: "POST", body: JSON.stringify(payload) }, token);
}

export function submitFeedback(payload: FeedbackCreateRequest, token: string): Promise<FeedbackCreateResponse> {
  return apiFetch<FeedbackCreateResponse>("/api/v1/feedback/", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function resolveSession(sessionId: string, payload: SessionResolveRequest, token: string): Promise<SessionResolveResponse> {
  return apiFetch<SessionResolveResponse>(`/api/v1/sessions/${sessionId}/resolve`, { method: "POST", body: JSON.stringify(payload) }, token);
}

export function escalateSession(sessionId: string, payload: SessionEscalateRequest, token: string): Promise<SessionEscalateResponse> {
  return apiFetch<SessionEscalateResponse>(`/api/v1/sessions/${sessionId}/escalate`, { method: "POST", body: JSON.stringify(payload) }, token);
}
