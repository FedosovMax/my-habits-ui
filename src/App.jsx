import React, { useEffect, useRef, useState } from "react";
import "./styles.css";
import HabitRow from "./HabitRow.jsx";
import { buildRetentionMap, isoDayUTC, classifyStatus } from "./retention.js";

const API_BASE   = (import.meta.env && import.meta.env.VITE_API_BASE) || "http://localhost:8080";
const HABITS_URL = `${API_BASE}/api/habits`;
const REPS_URL   = `${API_BASE}/api/repetitions`;
const EXPORT_URL = `${API_BASE}/api/export-db`;
const IMPORT_URL = `${API_BASE}/api/import-db`;
const REP_UPSERT = `${API_BASE}/api/repetitions`;
const REP_DELETE = `${API_BASE}/api/repetitions`;
const HABIT_PATCH= (id) => `${API_BASE}/api/habits/${id}`;

const RANGE_DAYS = 10; // today + 9 previous

function atUtcMidnightMs(d) { return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }
function endOfCurrentWeekExclusiveUTC() {
  const now = new Date();
  const todayMidnight = atUtcMidnightMs(now);
  const dow = now.getUTCDay();
  const daysUntilSunday = (7 - dow) % 7;
  const sundayMidnight = todayMidnight + daysUntilSunday * 86400000;
  return sundayMidnight + 86400000;
}
async function readJson(res){ const ct=res.headers.get("content-type")||""; if(ct.includes("application/json"))return res.json(); const t=await res.text(); return JSON.parse(t); }
function timestampedFilename(base="Loop_Export"){const pad=n=>String(n).padStart(2,"0");const now=new Date();return `${base}_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.db`;}
function pickArray(payload){ if(Array.isArray(payload))return payload; if(payload && Array.isArray(payload.habits))return payload.habits; return []; }

// Normalize backend variations so UI always has .description and .question
function normalizeHabit(h) {
  const description =
    h.description ?? h.desc ?? h.details ?? h.note ?? h.notes ?? h.descriptionText ?? "";
  const question =
    h.question ?? h.q ?? h.prompt ?? h.inquiry ?? h.titleQuestion ?? "";
  return {
    ...h,
    description: typeof description === "string" ? description : String(description ?? ""),
    question: typeof question === "string" ? question : String(question ?? ""),
  };
}

export default function App() {
  const [habits, setHabits] = useState([]);
  const [retention, setRetention] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);
  const didFetch = useRef(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // HABITS
      const hRes = await fetch(HABITS_URL, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!hRes.ok) throw new Error(`Habits: ${hRes.status} ${hRes.statusText} ${await hRes.text().catch(()=> "")}`);
      const habitsRaw = await readJson(hRes);
      const h = pickArray(habitsRaw)
        .map(normalizeHabit)
        .sort((a,b) => (a.position ?? 0) - (b.position ?? 0));
      setHabits(h);

      // REPS (window from 9 days ago through end of current week)
      const endExclusive = endOfCurrentWeekExclusiveUTC();
      const startDate = new Date(); startDate.setDate(startDate.getDate() - (RANGE_DAYS - 1));
      const from = atUtcMidnightMs(startDate);
      const rRes = await fetch(`${REPS_URL}?from=${from}&to=${endExclusive}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!rRes.ok) throw new Error(`Repetitions: ${rRes.status} ${rRes.statusText} ${await rRes.text().catch(()=> "")}`);
      const reps = await readJson(rRes);

      setRetention(buildRetentionMap(h, reps));
    } catch (e) {
      console.error(e);
      setError(e?.message || String(e));
      setHabits([]);
      setRetention({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!didFetch.current) { didFetch.current = true; fetchAll(); } }, []);

  // --- Import / Export ---
  const onPickImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setImporting(true);
      const fd = new FormData();
      fd.append("file", file, file.name || "import.db");
      const res = await fetch(IMPORT_URL, { method: "POST", body: fd });
      const text = await res.text().catch(() => "");
      if (!res.ok) throw new Error(text || `Import failed: ${res.status} ${res.statusText}`);
      await fetchAll();
      alert(text || "Import completed.");
    } catch (e2) {
      console.error(e2);
      alert("DB import failed: " + (e2?.message || e2));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const onClickExport = async () => {
    try {
      setExporting(true);
      const res = await fetch(EXPORT_URL, { method: "GET" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${await res.text().catch(()=> "")}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = timestampedFilename("Loop_Export");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("DB export failed: " + (e?.message || e));
    } finally {
      setExporting(false);
    }
  };

  // --- Repetitions write helpers ---
  async function upsertRepetition(habitId, dateMs, valueRaw, notes = null) {
    const res = await fetch(REP_UPSERT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/plain" },
      body: JSON.stringify({ habitId, timestamp: dateMs, value: valueRaw, notes }),
    });
    const txt = await res.text().catch(() => "");
    if (!res.ok) throw new Error(txt || `Save failed: ${res.status} ${res.statusText}`);
  }
  async function deleteRepetition(habitId, dateMs) {
    const url = new URL(REP_DELETE);
    url.searchParams.set("habitId", String(habitId));
    url.searchParams.set("timestamp", String(dateMs));
    const res = await fetch(url.toString(), { method: "DELETE", headers: { Accept: "text/plain" } });
    const txt = await res.text().catch(() => "");
    if (!res.ok) throw new Error(txt || `Delete failed: ${res.status} ${res.statusText}`);
  }
  function updateRetentionLocal(habit, dateMs, valueRawOrNull) {
    const key = isoDayUTC(dateMs);
    setRetention((prev) => {
      const copy = { ...prev };
      const inner = { ...(copy[habit.id] || {}) };
      if (valueRawOrNull == null) { delete inner[key]; }
      else { inner[key] = { ...classifyStatus(habit, valueRawOrNull), valueRaw: valueRawOrNull }; }
      copy[habit.id] = inner;
      return copy;
    });
  }

  const handleToggleCell = async (habit, dateMs, currentRec) => {
    try {
      if ((habit?.type ?? 0) === 0) {
        // boolean: toggle done/missed
        if (currentRec && currentRec.status === "done") {
          updateRetentionLocal(habit, dateMs, null);
          await deleteRepetition(habit.id, dateMs);
        } else {
          updateRetentionLocal(habit, dateMs, 2);
          await upsertRepetition(habit.id, dateMs, 2);
        }
      } else {
        // numeric: prompt amount
        const existingAmt = currentRec?.valueRaw ? (currentRec.valueRaw / 1000) : "";
        const input = window.prompt("Enter amount (e.g., 20.0). Leave empty to clear:", existingAmt === "" ? "" : String(existingAmt));
        if (input === null) return;
        const trimmed = String(input).trim();
        if (trimmed === "" || Number(trimmed) === 0) {
          updateRetentionLocal(habit, dateMs, null);
          await deleteRepetition(habit.id, dateMs);
        } else {
          const amount = Number(trimmed);
          if (!Number.isFinite(amount)) return;
          const raw = Math.round(amount * 1000);
          updateRetentionLocal(habit, dateMs, raw);
          await upsertRepetition(habit.id, dateMs, raw);
        }
      }
      await fetchAll();
    } catch (e) {
      console.error(e);
      alert(e?.message || String(e));
    }
  };

  // --- Save Question / Description ---
  const saveQuestion = async (habitId, question) => {
    const res = await fetch(HABIT_PATCH(habitId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => `Failed ${res.status}`));
    setHabits(prev => prev.map(h => (h.id === habitId ? normalizeHabit({ ...h, question }) : h)));
  };

  const saveDescription = async (habitId, description) => {
    const res = await fetch(HABIT_PATCH(habitId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ description }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => `Failed ${res.status}`));
    setHabits(prev => prev.map(h => (h.id === habitId ? normalizeHabit({ ...h, description }) : h)));
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Habits</h1>
        <div className="controls">
          <div className="controls-row">
            <button type="button" onClick={() => importInputRef.current?.click()} disabled={importing}>
              {importing ? "Importing…" : "Import SQLite (.db)"}
            </button>
            <input ref={importInputRef} type="file" accept=".db,application/octet-stream" style={{ display: "none" }} onChange={onPickImport} />
            <button type="button" onClick={onClickExport} disabled={exporting}>
              {exporting ? "Exporting…" : "Export SQLite (.db)"}
            </button>
            <button type="button" onClick={() => fetchAll()} disabled={loading} title="Reload">
              {loading ? "Reloading…" : "Reload"}
            </button>
          </div>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="habit-list">
        {loading && habits.length === 0 && !error && <div className="empty">Loading…</div>}
        {!loading && habits.length === 0 && !error && <div className="empty">No habits to show.</div>}

        {habits.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            rangeDays={RANGE_DAYS}
            strip={retention[h.id] || {}}
            onToggleCell={handleToggleCell}
            onSaveQuestion={saveQuestion}
            onSaveDescription={saveDescription}
          />
        ))}
      </section>
    </div>
  );
} 
