export async function downloadTemplate(path: string, filename: string) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error("Template download failed");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}
