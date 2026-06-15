"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import useSWR from "swr";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import type { ProductDetailResponse } from "@/lib/types/api";
import { createClient } from "@/lib/supabase/client";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import { cn, formatFileSize } from "@/lib/utils";
import { useCompany } from "@/hooks/use-company";
import { useUpload } from "@/hooks/use-upload";

interface ManualUploadFormProps {
  productId: string;
  onSuccess: () => void;
}

const languages = [
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
  { label: "German", value: "de" },
  { label: "French", value: "fr" },
  { label: "Spanish", value: "es" }
];

const ingestionSteps = [
  { key: "parsing", label: "Parse" },
  { key: "chunking", label: "Chunk" },
  { key: "embedding", label: "Embed" },
  { key: "indexing", label: "Index" }
];

async function accessToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function activeStep(currentStep: string): number {
  const index = ingestionSteps.findIndex((step) => currentStep.toLowerCase().includes(step.key));
  return Math.max(0, index);
}

export function ManualUploadForm({ productId, onSuccess }: ManualUploadFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { companyId } = useCompany();
  const uploadState = useUpload();
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [language, setLanguage] = useState("en");
  const [modelId, setModelId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const currentStepIndex = useMemo(() => activeStep(uploadState.currentStep), [uploadState.currentStep]);
  const product = useSWR<ProductDetailResponse, Error>(["product-detail", productId], async ([, id]: readonly [string, string]) => apiFetch<ProductDetailResponse>(`/api/v1/products/${id}`, undefined, await accessToken()), { revalidateOnFocus: false });

  function selectFile(nextFile: File): void {
    if (nextFile.type !== "application/pdf") {
      toast.error("Only PDF manuals are supported");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Manual must be ${MAX_FILE_SIZE_MB}MB or smaller`);
      return;
    }
    setFile(nextFile);
    if (!title) setTitle(nextFile.name.replace(/\.pdf$/i, ""));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!companyId || !file || !title.trim()) {
      toast.error("Select a company, title, and PDF manual");
      return;
    }
    await uploadState.upload(file, { company_id: companyId, product_id: productId, product_model_id: modelId || null, title, version: version || null, language, file });
    onSuccess();
  }

  function onDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    const droppedFile = event.dataTransfer.files.item(0);
    if (droppedFile) selectFile(droppedFile);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border bg-card p-6">
      <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20">
        <option value="">No specific model</option>
        {(product.data?.models ?? []).map((model) => <option key={model.id} value={model.id}>{model.display_name ?? model.model_number}</option>)}
      </select>
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Manual title" required className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
      <input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="Version" className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
      <select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20">
        {languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()} className={cn("cursor-pointer rounded-xl border-2 border-dashed border-border p-10 text-center transition-colors", dragging ? "border-primary bg-primary/5" : "")}>
        <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => { const selectedFile = event.target.files?.item(0); if (selectedFile) selectFile(selectedFile); }} />
        <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
        <div className="mt-4 text-sm font-medium text-foreground">{file ? file.name : "Drop your PDF manual here"}</div>
        <div className="mt-1 text-sm text-muted-foreground">{file ? formatFileSize(file.size) : <span>or <span className="text-primary">click to browse</span></span>}</div>
      </div>
      <AnimatePresence mode="wait">
        {uploadState.state !== "idle" ? (
          <motion.div key={uploadState.state} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="rounded-xl border bg-background p-4">
            {uploadState.state === "uploading" && file ? <div><div className="mb-2 flex justify-between text-sm text-muted-foreground"><span>{file.name}</span><span>{formatFileSize(Math.round((uploadState.progress / 100) * file.size))} / {formatFileSize(file.size)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${uploadState.progress}%` }} /></div></div> : null}
            {uploadState.state === "ingesting" ? <div><div className="mb-3 text-sm text-muted-foreground">{uploadState.currentStep || "Preparing ingestion..."}</div><div className="flex gap-2">{ingestionSteps.map((step, index) => <div key={step.key} className={cn("rounded-full px-3 py-1 text-xs font-medium", index < currentStepIndex ? "bg-primary/30 text-primary" : index === currentStepIndex ? "animate-pulse bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{step.label}</div>)}</div></div> : null}
            {uploadState.state === "complete" ? <div className="flex items-center gap-3 text-success"><CheckCircle2 className="h-5 w-5" /><span className="text-sm font-medium">{uploadState.chunkCount} knowledge chunks indexed</span></div> : null}
            {uploadState.state === "error" ? <div className="flex items-center gap-3 text-destructive"><AlertCircle className="h-5 w-5" /><span className="text-sm font-medium">{uploadState.errorMessage}</span></div> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <button type="submit" disabled={!file || uploadState.state === "uploading" || uploadState.state === "ingesting"} className="flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70">
        {uploadState.state === "uploading" || uploadState.state === "ingesting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Upload Manual
      </button>
    </form>
  );
}
