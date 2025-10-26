import React, { useEffect, useRef, useState } from "react";
import Heatmap from "./Heatmap.jsx";
import { getColorHex } from "../palette.js";

function isBlank(v) {
  return v == null || String(v).trim().length === 0;
}

function Multiline({ text }) {
  const lines = String(text).split(/\r?\n/);
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

function Section({ title, text }) {
  if (isBlank(text)) return null;
  return (
    <div className="habit-section" style={{ marginTop: 16 }}>
      <div className="habit-section-title" style={{ fontWeight: 600, marginBottom: 6 }}>
        {title}
      </div>
      <div className="habit-section-body" style={{ whiteSpace: "pre-wrap" }}>
        <Multiline text={text} />
      </div>
    </div>
  );
}

// Match top controls (Import/Export/Reload)
const btnStyle = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  lineHeight: 1,
  fontWeight: 600,
};

// Fixed heatmap sizing kept in the card to avoid “jumping”
const CELL = 24;
const GAP = 6;
const LABEL = 14;
const HEATMAP_BLOCK_HEIGHT = LABEL + 3 * CELL + 2 * GAP + 6;

export default function HabitCard({
  habit,
  retentionByDay,
  onEdit,
  onEditCell,         // <-- new: callback from App to change a cell
  dragging = false,
  dragOver = false,
}) {
  const colorHex = getColorHex(habit?.color);

  // --- Options (⋮) menu right next to the title ---
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector("button")?.focus();
  }, [open]);

  const handleEdit = () => { setOpen(false); onEdit?.(); };

  return (
    <article
      className="habit-card"
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${colorHex}`,
        borderRadius: 14,
        padding: 12,
        transition: "box-shadow 120ms ease, transform 120ms ease, border-color 120ms ease",
        boxShadow: dragOver
          ? `0 0 0 2px ${colorHex}33`
          : dragging
          ? "0 6px 24px rgba(0,0,0,0.25)"
          : "none",
        transform: dragging ? "scale(1.02)" : "none",
        background: "transparent",
        boxSizing: "border-box",
      }}
    >
      <header className="habit-header" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Title + color dot + options button */}
        <div className="habit-title" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            className="dot"
            style={{
              width: 10, height: 10, borderRadius: "50%", background: colorHex, display: "inline-block",
            }}
          />
          <strong>{habit.name}</strong>

          {/* Options button */}
          <div style={{ position: "relative", marginLeft: 6 }}>
            <button
              ref={btnRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={open ? "true" : "false"}
              title="Options"
              onClick={() => setOpen((v) => !v)}
              style={{ ...btnStyle, width: 32, padding: "6px 0" }}
            >
              <span aria-hidden="true" style={{ fontSize: 16 }}>⋮</span>
            </button>

            {open && (
              <div
                ref={menuRef}
                role="menu"
                style={{
                  position: "absolute",
                  left: 0,
                  top: "calc(100% + 6px)",
                  minWidth: 140,
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  padding: 6,
                  zIndex: 50,
                }}
              >
                <button
                  role="menuitem"
                  onClick={handleEdit}
                  style={{
                    ...btnStyle,
                    width: "100%",
                    textAlign: "left",
                    fontWeight: 500,
                    padding: "8px 10px",
                    border: "none",
                  }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Heatmap block (fixed size), tinted by habit color */}
      <div style={{ marginTop: 16, marginBottom: 16, height: HEATMAP_BLOCK_HEIGHT }}>
        <Heatmap
          habit={habit}
          retentionByDay={retentionByDay || {}}
          baseColor={colorHex}
          cellSize={CELL}
          gap={GAP}
          labelHeight={LABEL}
          highlightCurrentWeek
          onEdit={onEditCell}
        />
      </div>

      {/* Description / Question */}
      {!isBlank(habit.description) && <Section title="Description:" text={habit.description} />}
      {!isBlank(habit.question) && <Section title="Question:" text={habit.question} />}

      <div style={{ flex: 1 }} />
    </article>
  );
}
