// GET the whole DB from backend and download it
const EXPORT_URL = "/api/export-db";

export async function downloadWholeDb(filename = "Loop_Export.db") {
  const res = await fetch(EXPORT_URL, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Export failed: ${res.status} ${res.statusText} ${text}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
