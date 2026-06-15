"use client";

import { useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

import { MediaInputs } from "@/components/media-inputs";
import { useStreamAgent } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

interface SupportComposerProps {
  sessionId: string;
  onMessageSent: () => void;
  onSend?: (message: string, mediaIds: string[]) => Promise<void>;
  isStreaming?: boolean;
}

export function SupportComposer({ sessionId, onMessageSent, onSend, isStreaming: externalStreaming }: SupportComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fallbackStream = useStreamAgent();
  const [value, setValue] = useState<string>("");
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [mediaBusy, setMediaBusy] = useState<boolean>(false);
  const isStreaming = externalStreaming ?? fallbackStream.isStreaming;

  function resize(): void {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }

  async function submit(): Promise<void> {
    const message = value.trim();
    if (!message || isStreaming) return;
    setValue("");
    setMediaIds([]);
    if (textareaRef.current) textareaRef.current.style.height = "0px";
    if (onSend) {
      await onSend(message, mediaIds);
    } else {
      await fallbackStream.stream(sessionId, message, mediaIds, onMessageSent);
    }
    onMessageSent();
  }

  return (
    <div className="space-y-2">
      {mediaBusy ? (
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing media
        </div>
      ) : null}
      <div className="flex items-end gap-2 rounded-2xl border bg-card p-2">
        <MediaInputs
          sessionId={sessionId}
          onBusyChange={setMediaBusy}
          onMediaUploaded={(mediaId) => setMediaIds((items) => [...items, mediaId])}
          onImageSelected={() => {
            setValue((text) => `${text}${text ? "\n" : ""}[Image uploaded and analyzed]`);
            requestAnimationFrame(resize);
          }}
          onTranscript={(transcript) => {
            setValue(transcript);
            requestAnimationFrame(resize);
          }}
        />
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          placeholder="Describe your issue..."
          className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          onInput={resize}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <button type="button" disabled={isStreaming || !value.trim()} className={cn("rounded-full bg-primary p-2 text-primary-foreground transition-opacity", isStreaming || !value.trim() ? "opacity-50" : "hover:opacity-90")} onClick={() => void submit()}>
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
