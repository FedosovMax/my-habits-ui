import React, { useRef, useState } from "react";

const IMPORT_URL = "/api/import-db";

export default function ImportDbButton() {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      const fd = new FormData();
      fd.append("file", file, file.name || "import.db");

      const res = await fetch(IMPORT_URL, { method: "POST", body: fd });
      const text = await res.text().catch(() => "");
      if (!res.ok) throw new Error(text || `Import failed: ${res.status} ${res.statusText}`);
      alert(text || "Import completed.");
    } catch (e2) {
      console.error(e2);
      alert("DB import failed: " + (e2?.message || e2));
    } finally {
      setBusy(false);
      e.target.value = ""; // reset picker
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontWeight: 600 }}
        title="Import a SQLite .db and replace the server database"
      >
        {busy ? "Importing…" : "Import SQLite (.db)"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".db,application/octet-stream"
        style={{ display: "none" }}
        onChange={onPick}
      />
    </>
  );
}
