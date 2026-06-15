"use client";

import { useRef, useState } from "react";
import { Mic, Paperclip } from "lucide-react";
import { toast } from "sonner";

import { analyzeMedia, transcribeMedia, uploadMedia } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface MediaInputsProps {
  sessionId: string;
  onImageSelected: (file: File) => void;
  onTranscript: (text: string) => void;
  onMediaUploaded?: (mediaId: string) => void;
  onBusyChange?: (busy: boolean) => void;
}

async function token(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function MediaInputs({ sessionId, onImageSelected, onTranscript, onMediaUploaded, onBusyChange }: MediaInputsProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  async function handleImage(file: File): Promise<void> {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Images must be under 10 MB");
      return;
    }

    onBusyChange?.(true);
    try {
      const response = await uploadMedia({ session_id: sessionId, media_type: "image", file }, await token());
      await analyzeMedia(response.media_id, { prompt: null }, await token());
      onMediaUploaded?.(response.media_id);
      onImageSelected(file);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Image upload failed";
      toast.error(message);
    } finally {
      onBusyChange?.(false);
    }
  }

  async function startRecording(): Promise<void> {
    if (!("mediaDevices" in navigator) || typeof MediaRecorder === "undefined") {
      toast.error("Voice recording is not available in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent): void => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = (): void => {
        void finishRecording();
      };
      recorder.start();
      setIsRecording(true);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to start recording";
      toast.error(message);
    }
  }

  async function finishRecording(): Promise<void> {
    setIsRecording(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (chunksRef.current.length === 0) return;

    onBusyChange?.(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "voice-note.webm", { type: "audio/webm" });
      const uploaded = await uploadMedia({ session_id: sessionId, media_type: "audio", file }, await token());
      const transcript = await transcribeMedia(uploaded.media_id, await token());
      onMediaUploaded?.(uploaded.media_id);
      onTranscript(transcript.transcript);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Voice transcription failed";
      toast.error(message);
    } finally {
      chunksRef.current = [];
      onBusyChange?.(false);
    }
  }

  function stopRecording(): void {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImage(file);
          event.currentTarget.value = "";
        }}
      />
      <button type="button" className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={() => imageInputRef.current?.click()}>
        <Paperclip className="h-4 w-4" />
      </button>
      <button type="button" className={cn("rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", isRecording ? "animate-pulse text-destructive ring-2 ring-destructive/30" : "")} onPointerDown={() => void startRecording()} onPointerUp={stopRecording} onPointerLeave={stopRecording}>
        <Mic className="h-4 w-4" />
      </button>
    </div>
  );
}
