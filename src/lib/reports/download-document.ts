function getFilenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const match = header.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

export async function downloadDailyReportDocument(
  reportId: string,
  fallbackFilename = "daily-report.docx"
) {
  const response = await fetch(`/api/daily-reports/${reportId}/download`);

  if (!response.ok) {
    throw new Error("Failed to download the report file.");
  }

  const blob = await response.blob();
  const filename = getFilenameFromDisposition(
    response.headers.get("Content-Disposition"),
    fallbackFilename
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
