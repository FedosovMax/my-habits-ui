import React, { useState } from "react";

const EXPORT_URL = "/api/export-db";

export default function ExportDbButton({ filename = "Loop_Export.db" }) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    try {
      setBusy(true);
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
    } catch (e) {
      console.error(e);
      alert("DB export failed: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontWeight: 600 }}
      title="Export the live SQLite database"
    >
      {busy ? "Exporting…" : "Export SQLite (.db)"}
    </button>
  );
}
