export function sanitizeUploadFilename(filename: string) {
  const trimmed = filename.trim();
  const base = trimmed.split(/[/\\]/).pop() ?? "daily-report.docx";
  const sanitized = base
    .replace(/[^\w.\-() ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);

  return sanitized || "daily-report.docx";
}

export function buildDailyReportStoragePath(
  internId: string,
  reportDate: string,
  filename: string
) {
  const safeName = sanitizeUploadFilename(filename);
  const uniqueSuffix = `${Date.now()}`;
  return `daily-reports/${internId}/${reportDate}/${uniqueSuffix}-${safeName}`;
}

export function getFileExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

export function isAcceptedDailyReportFile(file: Pick<File, "name" | "type" | "size">) {
  const extension = getFileExtension(file.name);
  const acceptedExtensions = [".docx", ".pdf"];
  const acceptedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/pdf",
  ];

  if (file.size <= 0) {
    return { valid: false, error: "The selected file is empty." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "File size must be 10 MB or less." };
  }

  const extensionOk = acceptedExtensions.includes(extension);
  const mimeOk =
    !file.type || acceptedMimeTypes.includes(file.type) || extensionOk;

  if (!extensionOk || !mimeOk) {
    return {
      valid: false,
      error: "Only .docx and .pdf files are supported.",
    };
  }

  return { valid: true, error: null };
}
