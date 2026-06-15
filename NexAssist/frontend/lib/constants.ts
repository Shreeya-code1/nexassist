export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const DEMO_COMPANY_ID = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? "";

export const SUPPORTED_FILE_TYPES: string[] = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];

export const MAX_FILE_SIZE_MB = 50;

export const SESSION_STATUS_COLORS: Record<string, string> = {
  active: "text-primary",
  resolved: "text-success",
  escalated: "text-warning",
  abandoned: "text-muted-foreground"
};
