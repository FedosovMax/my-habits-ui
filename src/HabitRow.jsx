import React, { useMemo, useState, useRef, useEffect } from "react";
import { getColorHex } from "./palette.js";
import { isoDayUTC } from "./retention.js";

// helpers
function atUtcMidnightMs(d) { return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }
function isWeekend(tsMs) {
  const d = new Date(tsMs);
  const wd = d.getUTCDay(); // 0=Sun,6=Sat
  return wd === 0 || wd === 6;
}
const WD = ["Su","Mo","Tu","We","Th","Fr","Sa"];

/** SVG check: filled for done/partial; paler outline for missed */
function CheckIcon({
  color,
  filled,
  size = 26,
  outlineOpacity = 0.38,
  outlineThick = 2.6,
  thick = 5.2
}) {
  const stroke = color || "#6ea8fe";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      {filled && <rect x="0" y="0" width="24" height="24" rx="6" ry="6" fill={stroke} opacity="0.28" />}
      <path
        d="M4.5 12.5L9.0 17.0L19.5 6.5"
        fill="none"
        stroke={stroke}
        strokeOpacity={filled ? 1 : outlineOpacity}
        strokeWidth={filled ? thick : outlineThick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HabitRow({
  habit,
  strip,            // { "YYYY-MM-DD": {status, valueRaw} }
  rangeDays,        // columns (today on the left)
  onToggleCell,     // (habit, dateMs, currentRec) =>
  onSaveQuestion,   // (habitId, question) =>
  onSaveDescription // (habitId, description) =>
}) {
  const color = getColorHex(habit?.color);
  const today = useMemo(() => atUtcMidnightMs(new Date()), []);
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < rangeDays; i++) arr.push(today - i * 86400000);
    return arr;
  }, [rangeDays, today]);

  const map = strip || {};

  // Hidden by default; click row to toggle
  const [open, setOpen] = useState(false);

  // Independent editors for question & description
  const [editingQ, setEditingQ] = useState(false);
  const [editingD, setEditingD] = useState(false);
  const [qDraft, setQDraft] = useState(habit.question || "");
  const [dDraft, setDDraft] = useState(habit.description || "");
  const qRef = useRef(null);
  const dRef = useRef(null);

  useEffect(() => { setQDraft(habit.question || ""); }, [habit.question]);
  useEffect(() => { setDDraft(habit.description || ""); }, [habit.description]);
  useEffect(() => { if (editingQ) qRef.current?.focus(); }, [editingQ]);
  useEffect(() => { if (editingD) dRef.current?.focus(); }, [editingD]);

  const handleRowClick = (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "button" || tag === "input" || e.target.closest(".cells")) return;
    setOpen((v) => !v);
  };

  const saveQ = async () => {
    const next = qDraft ?? "";
    if (next.trim() === (habit.question || "").trim()) { setEditingQ(false); return; }
    await onSaveQuestion?.(habit.id, next);
    setEditingQ(false);
  };
  const saveD = async () => {
    const next = dDraft ?? "";
    if (next.trim() === (habit.description || "").trim()) { setEditingD(false); return; }
    await onSaveDescription?.(habit.id, next);
    setEditingD(false);
  };

  const labelFor = (ts) => {
    const d = new Date(ts);
    const lab = WD[d.getUTCDay()];
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${lab} ${day}`;
  };

  return (
    <div className="habit-row">
      <div className="row-top" onClick={handleRowClick}>
        <div className="row-name">
          <span className="dot" style={{ background: color }} />
          <span className="title">{habit.name}</span>
        </div>

        {/* Day labels and cells */}
        <div className="cells">
          <div className="cells-header">
            {days.map((ts, i) => {
              const weekend = isWeekend(ts);
              return (
                <div key={`h-${i}`} className={`cells-label ${weekend ? "weekend" : ""}`} title={new Date(ts).toUTCString().slice(0,16)}>
                  {labelFor(ts)}
                </div>
              );
            })}
          </div>

          <div className="cells-grid">
            {days.map((ts, i) => {
              const key = isoDayUTC(ts);
              const rec = map[key];
              const weekend = isWeekend(ts);
              const status = rec?.status || "missed";
              const isNumeric = Number(habit?.type ?? 0) !== 0;

              return (
                <button
                  key={`c-${i}`}
                  className={`cell icon-only ${weekend ? "weekend" : ""}`}
                  title={new Date(ts).toUTCString().slice(0, 16) + (status ? ` — ${status}` : "")}
                  onClick={(e) => { e.stopPropagation(); onToggleCell?.(habit, ts, rec || null); }}
                >
                  {isNumeric ? (
                    (typeof rec?.valueRaw === "number" && rec.valueRaw > 0) ? (
                      <span className="cell-num" style={{ color }}>
                        {Math.round(rec.valueRaw / 100) / 10}
                      </span>
                    ) : (
                      <span className="cell-num empty">&nbsp;</span>
                    )
                  ) : (
                    <span className={`cell-check ${status === "done" || status === "partial" ? "filled" : "outline"}`}>
                      <CheckIcon color={color} filled={status === "done" || status === "partial"} size={24} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Collapsible details: Question first, then Description (both editable) */}
      {open && (
        <div className="row-desc">
          {/* Question */}
          <div className="kv" onDoubleClick={() => setEditingQ(true)}>
            <div className="kv-label">Question</div>
            {!editingQ ? (
              <div className="kv-value" style={{ whiteSpace: "pre-wrap" }}>
                {(habit.question && habit.question.trim()) || "—"}
              </div>
            ) : (
              <div className="desc-editor">
                <textarea
                  ref={qRef}
                  value={qDraft}
                  onChange={(e) => setQDraft(e.target.value)}
                  onBlur={saveQ}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); saveQ(); }
                    if (e.key === "Escape") { e.preventDefault(); setEditingQ(false); setQDraft(habit.question || ""); }
                  }}
                  rows={Math.min(6, Math.max(2, (qDraft.match(/\n/g)?.length || 0) + 1))}
                  placeholder="Type question… (⌘/Ctrl+Enter to save, Esc to cancel)"
                />
                <div className="desc-actions">
                  <button onClick={saveQ}>Save</button>
                  <button onClick={() => { setEditingQ(false); setQDraft(habit.question || ""); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="kv" onDoubleClick={() => setEditingD(true)}>
            <div className="kv-label">Description</div>
            {!editingD ? (
              <div className="kv-value" style={{ whiteSpace: "pre-wrap" }}>
                {(habit.description && habit.description.trim()) || "—"}
              </div>
            ) : (
              <div className="desc-editor">
                <textarea
                  ref={dRef}
                  value={dDraft}
                  onChange={(e) => setDDraft(e.target.value)}
                  onBlur={saveD}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); saveD(); }
                    if (e.key === "Escape") { e.preventDefault(); setEditingD(false); setDDraft(habit.description || ""); }
                  }}
                  rows={Math.min(6, Math.max(2, (dDraft.match(/\n/g)?.length || 0) + 1))}
                  placeholder="Type description… (⌘/Ctrl+Enter to save, Esc to cancel)"
                />
                <div className="desc-actions">
                  <button onClick={saveD}>Save</button>
                  <button onClick={() => { setEditingD(false); setDDraft(habit.description || ""); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div className="desc-hint" style={{ marginTop: 8 }}>
            Double-click Question or Description to edit.
          </div>
        </div>
      )}
    </div>
  );
}
