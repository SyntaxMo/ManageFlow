"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp, Upload, X } from "lucide-react";
import { submitDailyReportDocument } from "@/lib/reports/actions";
import { isAcceptedDailyReportFile } from "@/lib/reports/storage";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface InternDailyReportUploadPanelProps {
  replaceMode: boolean;
  onCancelReplace: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function InternDailyReportUploadPanel({
  replaceMode,
  onCancelReplace,
  onSuccess,
  onError,
}: InternDailyReportUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateAndSelect(file: File | null) {
    setValidationError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const result = isAcceptedDailyReportFile(file);
    if (!result.valid) {
      setSelectedFile(null);
      setValidationError(result.error ?? "Unsupported file.");
      return;
    }

    setSelectedFile(file);
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    validateAndSelect(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    validateAndSelect(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  async function handleSubmit() {
    if (!selectedFile || isSubmitting) return;

    const validation = isAcceptedDailyReportFile(selectedFile);
    if (!validation.valid) {
      setValidationError(validation.error ?? "Unsupported file.");
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (replaceMode) {
      formData.append("replace", "true");
    }

    const result = await submitDailyReportDocument(formData);

    if (!result.success) {
      onError(result.error);
      setIsSubmitting(false);
      return;
    }

    setSelectedFile(null);
    setIsSubmitting(false);
    onSuccess();
  }

  return (
    <div className="mx-auto mt-5 max-w-md text-left">
      {replaceMode && (
        <div className="mb-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Replacing your submitted report will upload a new file for today.
          <button
            type="button"
            onClick={onCancelReplace}
            disabled={isSubmitting}
            className="ml-2 font-medium underline"
          >
            Cancel
          </button>
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "rounded-[10px] border border-dashed px-4 py-6 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-background"
        )}
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-medium text-ink">
          Drag and drop your completed report
        </p>
        <p className="mt-1 text-xs text-muted">.docx preferred · .pdf accepted · 10 MB max</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isSubmitting}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-[10px] border border-border bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          Browse Files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
          className="sr-only"
          onChange={handleFileInputChange}
          disabled={isSubmitting}
        />
      </div>

      {validationError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {validationError}
        </p>
      )}

      {selectedFile && (
        <div className="mt-4 flex items-center gap-3 rounded-[10px] border border-border bg-white px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
            <FileUp className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{selectedFile.name}</p>
            <p className="text-xs text-muted">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => validateAndSelect(null)}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-background hover:text-ink disabled:opacity-60"
            aria-label="Remove selected file"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedFile || isSubmitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-deep px-4 text-sm font-medium text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    </div>
  );
}
