import React from "react";
import { lighten } from "../palette.js";

// ---------- UTC helpers ----------
function isoDayUTC(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function atUtcMidnightMs(d) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function startOfWeekMondayUTC(d) {
  const dow = d.getUTCDay(); // 0..6, Sun..Sat
  const daysSinceMon = (dow + 6) % 7; // Mon=0 ... Sun=6
  const ms = atUtcMidnightMs(d) - daysSinceMon * 86400000;
  return new Date(ms);
}
function hexToRgba(hex, a = 1) {
  const m = (hex || "").replace("#", "").match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return `rgba(153,153,153,${a})`;
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function formatAmount(raw) {
  const amt = (raw ?? 0) / 1000;
  if (Number.isInteger(amt)) return String(amt);
  // up to one decimal feels readable in 24px cells
  return String(Math.round(amt * 10) / 10);
}

/**
 * Props:
 *  - habit: the habit object ({ id, type, targetValue, ... })
 *  - retentionByDay: { "YYYY-MM-DD": {status, score, valueRaw} }
 *  - baseColor: hex color for "done"; "partial" is lighter; "missed" neutral
 *  - cellSize (default 24), gap (default 6), labelHeight (default 14)
 *  - highlightCurrentWeek (default true)
 *  - onEdit: function({ habit, dateMs, current }) called when a cell is clicked
 *
 * Fixed layout:
 *  - 7 columns (Mon..Sun) with weekday labels above
 *  - 3 rows (top = current week, then prev, then prev-prev)
 *  - Top-right cell is this week's Sunday; bottom-left is Monday two weeks ago.
 */
export default function Heatmap({
  habit,
  retentionByDay = {},
  baseColor = "#2ecc71",
  cellSize = 24,
  gap = 6,
  labelHeight = 14,
  highlightCurrentWeek = true,
  onEdit,
}) {
  const cols = 7;
  const rows = 3;
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const rowWidth = cols * cellSize + (cols - 1) * gap;
  const totalHeight = labelHeight + rows * cellSize + (rows - 1) * gap + 6; // +6 label margin

  const nowUTC = new Date();
  const thisMon = startOfWeekMondayUTC(nowUTC);

  const colorFor = (lvl) => {
    if (lvl === 2) return baseColor;                  // done
    if (lvl === 1) return lighten(baseColor, 0.45);   // partial
    return "#2f2f2f";                                 // missed
  };

  // Build 3x7 matrix (top=current week)
  const weeks = [0, 1, 2]; // 0=current, 1=prev, 2=prev-prev
  const grid = weeks.map((wIdx) => {
    const rowMon = new Date(thisMon.getTime() - wIdx * 7 * 86400000);
    return daysOfWeek.map((_, colIdx) => {
      const cellDateMs = rowMon.getTime() + colIdx * 86400000;
      const key = isoDayUTC(cellDateMs);
      const rec = retentionByDay[key];
      const status = rec?.status || "missed";
      const level = status === "done" ? 2 : status === "partial" ? 1 : 0;
      return { key, status, level, dateMs: cellDateMs, rec };
    });
  });

  return (
    <div style={{ width: rowWidth, height: totalHeight }}>
      {/* Weekday labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gap,
          height: labelHeight,
          alignItems: "end",
          marginBottom: 6,
          userSelect: "none",
        }}
      >
        {daysOfWeek.map((label) => (
          <div
            key={label}
            style={{ width: cellSize, textAlign: "center", fontSize: 11, opacity: 0.85 }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 3 weeks (top=current); highlight current row */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          gridRowGap: gap,
        }}
      >
        {grid.map((row, rIdx) => (
          <div key={`row-${rIdx}`} style={{ position: "relative", width: rowWidth, height: cellSize }}>
            {highlightCurrentWeek && rIdx === 0 && (
              <div
                style={{
                  position: "absolute",
                  left: -gap / 2,
                  right: -gap / 2,
                  top: -gap / 2,
                  bottom: -gap / 2,
                  borderRadius: 10,
                  background: hexToRgba(baseColor, 0.12),
                  border: `1px solid ${hexToRgba(baseColor, 0.35)}`,
                  zIndex: 0,
                }}
              />
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                gap,
                position: "relative",
                zIndex: 1,
              }}
            >
              {row.map((c) => {
                const showNumber = habit?.type === 1 && c.rec?.valueRaw > 0;
                return (
                  <button
                    key={c.key}
                    type="button"
                    title={`${new Date(c.dateMs).toUTCString().slice(0, 16)} — ${c.status}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 6,
                      background: colorFor(c.level),
                      border: "1px solid #3a3a3a",
                      cursor: "pointer",
                      padding: 0,
                      position: "relative",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                    onClick={() => onEdit?.({ habit, dateMs: c.dateMs, current: c.rec || null })}
                  >
                    {showNumber && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                          lineHeight: 1,
                          textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                        }}
                      >
                        {formatAmount(c.rec.valueRaw)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
