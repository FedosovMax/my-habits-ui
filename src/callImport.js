// POST a picked .db file to backend to replace live DB
const IMPORT_URL = "/api/import-db";

export async function uploadDbForImport(file) {
  const fd = new FormData();
  fd.append("file", file, file.name || "import.db");

  const res = await fetch(IMPORT_URL, {
    method: "POST",
    body: fd,
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(text || `Import failed: ${res.status} ${res.statusText}`);
  return text || "Import completed.";
}
