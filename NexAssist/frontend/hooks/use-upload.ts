"use client";

import { useCallback, useRef, useState } from "react";

import { API_BASE_URL } from "@/lib/constants";
import { getIngestionJob, type UploadManualParams } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export type UploadState = "idle" | "uploading" | "ingesting" | "complete" | "error";

export interface UseUploadResult {
  state: UploadState;
  progress: number;
  currentStep: string;
  jobId: string | null;
  chunkCount: number;
  errorMessage: string | null;
  upload: (file: File, metadata: UploadManualParams) => Promise<void>;
}

interface UploadResponse {
  manual_id: string;
  ingestion_job_id: string;
  status: string;
}

const stepLabels: Record<string, string> = {
  downloading: "Downloading PDF...",
  parsing: "Parsing document...",
  chunking: "Splitting into chunks...",
  embedding: "Generating embeddings...",
  indexing: "Indexing knowledge base..."
};

async function token(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function uploadViaXhr(file: File, metadata: UploadManualParams, accessToken: string, onProgress: (progress: number) => void): Promise<UploadResponse> {
  const formData = new FormData();
  formData.set("company_id", metadata.company_id);
  formData.set("product_id", metadata.product_id);
  if (metadata.product_model_id) formData.set("product_model_id", metadata.product_model_id);
  formData.set("title", metadata.title);
  if (metadata.version) formData.set("version", metadata.version);
  formData.set("language", metadata.language);
  formData.set("file", file);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE_URL}/api/v1/manuals/upload`);
    request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(JSON.parse(request.responseText) as UploadResponse);
        return;
      }
      reject(new Error(request.responseText || "Upload failed"));
    };
    request.onerror = () => reject(new Error("Upload failed"));
    request.send(formData);
  });
}

export function useUpload(): UseUploadResult {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  const upload = useCallback(async (file: File, metadata: UploadManualParams): Promise<void> => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    setState("uploading");
    setProgress(0);
    setCurrentStep("");
    setErrorMessage(null);
    const accessToken = await token();
    try {
      const response = await uploadViaXhr(file, metadata, accessToken, setProgress);
      setJobId(response.ingestion_job_id);
      setState("ingesting");
      pollingRef.current = window.setInterval(async () => {
        const job = await getIngestionJob(response.ingestion_job_id, accessToken);
        setCurrentStep(job.current_step ? stepLabels[job.current_step] ?? job.current_step : "Preparing ingestion...");
        if (job.status === "completed") {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          setChunkCount(job.chunks_created);
          setState("complete");
        }
        if (job.status === "failed") {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          setErrorMessage(job.error_message ?? "Ingestion failed");
          setState("error");
        }
      }, 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
      setState("error");
    }
  }, []);

  return { state, progress, currentStep, jobId, chunkCount, errorMessage, upload };
}
