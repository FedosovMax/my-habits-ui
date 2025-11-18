import React, { useEffect, useMemo, useRef, useState } from "react";
import { getColorHex } from "./palette.js";
import { isoDayUTC } from "./retention.js";

const WD = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function CheckIcon({
  color,
  filled,
  size = 26,
  outlineOpacity = 0.38,
  outlineThick = 2.6,
  thick = 5.2,
}) {
  const stroke = color || "#6ea8fe";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "block" }}
    >
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
  strip,
  maxDays = 10,
  onToggleCheck,
  onSetAmount,
  onSaveQuestion,
  onSaveDescription,
  onArchive,
  onUnarchive,
  // drag & drop props from App.jsx
  dragActive,
  isDragging,
  isDragOver,
  onDragStartRow,
  onDragEnterRow,
  onDragOverRow,
  onDropRow,
  onDragEndRow,
}) {
  const color = getColorHex(habit?.color);

  // 3 columns under 900px, otherwise 10
  const isSmall = window.matchMedia("(max-width: 900px)").matches;
  const [cols, setCols] = useState(isSmall ? 3 : 10);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const handler = (e) => setCols(e.matches ? 3 : 10);
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
    } else {
      mq.addListener(handler);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handler);
      } else {
        mq.removeListener(handler);
      }
    };
  }, []);

  // days list
  const daysLocal = useMemo(() => {
    const desired = Math.min(cols, maxDays);
    const out = [];
    let cur = new Date();
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()); // local midnight
    for (let i = 0; i < desired; i++) {
      out.push(new Date(cur));
      cur = new Date(cur.getTime() - 86400000);
    }
    return out;
  }, [cols, maxDays]);

  const rowStyle = useMemo(
    () => ({ "--cols": String(Math.min(cols, maxDays)) }),
    [cols, maxDays]
  );

  // Collapsible editors
  const [open, setOpen] = useState(false);
  const [editingQ, setEditingQ] = useState(false);
  const [editingD, setEditingD] = useState(false);
  const [qDraft, setQDraft] = useState(habit.question || "");
  const [dDraft, setDDraft] = useState(habit.description || "");
  const qRef = useRef(null);
  const dRef = useRef(null);

  useEffect(() => {
    setQDraft(habit.question || "");
  }, [habit.question]);
  useEffect(() => {
    setDDraft(habit.description || "");
  }, [habit.description]);
  useEffect(() => {
    if (editingQ) qRef.current?.focus();
  }, [editingQ]);
  useEffect(() => {
    if (editingD) dRef.current?.focus();
  }, [editingD]);

  const handleRowClick = (e) => {
    if (dragActive) return; // don’t toggle while dragging
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "button" || tag === "input" || e.target.closest(".cells")) return;
    setOpen((v) => !v);
  };

  const saveQ = async () => {
    const next = qDraft ?? "";
    if (next.trim() === (habit.question || "").trim()) {
      setEditingQ(false);
      return;
    }
    await onSaveQuestion?.(habit.id, next);
    setEditingQ(false);
  };

  const saveD = async () => {
    const next = dDraft ?? "";
    if (next.trim() === (habit.description || "").trim()) {
      setEditingD(false);
      return;
    }
    await onSaveDescription?.(habit.id, next);
    setEditingD(false);
  };

  const labelFor = (d) =>
    `${WD[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;

  const localDateToUtcMidnightMs = (d) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

  // inline numeric editing
  const [editingCell, setEditingCell] = useState(null); // ISO day string
  const editableRef = useRef(null);

  const displayFromRaw = (raw) => Math.round(raw / 100) / 10; // 1 decimal

  const initialTextFromRaw = (raw) =>
    raw != null ? String(Math.round(raw / 100) / 10) : "";

  const placeCaretAtEnd = (el) => {
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      // ignore
    }
  };

  const sanitizeToOneDecimal = (text) => {
    const v = text.replace(",", ".").replace(/[^\d.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("").slice(0, 1);
    }
    if (parts.length === 2) {
      return (parts[0] || "") + "." + parts[1].slice(0, 1);
    }
    return parts[0] || "";
  };

  const commitAmount = async (habit, utcMs, el) => {
    const rawText = (el.textContent || "").trim();
    const cleaned = sanitizeToOneDecimal(rawText);
    const val = cleaned === "" ? null : Number(cleaned);
    await onSetAmount?.(habit, utcMs, val);
    setEditingCell(null);
  };

  return (
    <div
      className={`habit-row ${
        habit.archived ? "is-archived" : ""
      } ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
      onDragEnter={() => onDragEnterRow?.()}
      onDragOver={(e) => onDragOverRow?.(e)}
      onDrop={() => onDropRow?.()}
      onDragEnd={() => onDragEndRow?.()}
    >
      <div className="row-top" style={rowStyle} onClick={handleRowClick}>
        <div className="row-name">
          {/* This is the drag handle you should see */}
          <span
            className="drag-handle"
            draggable
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => onDragStartRow?.(e)}
            title="Drag to reorder"
          >
            ⋮⋮
          </span>

          <span className="dot" style={{ background: color }} />
          <span className="title">
            {habit.name}
            {habit.archived && (
              <span className="arch-badge" title="Archived">
                Archived
              </span>
            )}
          </span>
        </div>

        <div className="cells">
          <div className="cells-header">
            {daysLocal.map((d, i) => (
              <div
                key={`h-${i}`}
                className="cells-label"
                title={d.toString().slice(0, 16)}
              >
                {labelFor(d)}
              </div>
            ))}
          </div>

          <div className="cells-grid">
            {daysLocal.map((d, i) => {
              const utcMidnightMs = localDateToUtcMidnightMs(d);
              const key = isoDayUTC(utcMidnightMs);
              const rec = (strip || {})[key];
              const status = rec?.status || "missed";
              const isNumeric = Number(habit?.type ?? 0) !== 0;
              const isEditing = editingCell === key;

              return (
                <div key={`c-${i}`} className="cell-wrapper">
                  {!isNumeric ? (
                    <button
                      className="cell icon-only"
                      title={
                        d.toString().slice(0, 16) +
                        (status ? ` — ${status}` : "")
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCheck?.(habit, utcMidnightMs, rec || null);
                      }}
                    >
                      <span
                        className={`cell-check ${
                          status === "done" || status === "partial"
                            ? "filled"
                            : "outline"
                        }`}
                      >
                        <CheckIcon
                          color={color}
                          filled={
                            status === "done" || status === "partial"
                          }
                          size={24}
                        />
                      </span>
                    </button>
                  ) : (
                    <div
                      className="cell cell-numeric"
                      onClick={(e) => e.stopPropagation()}
                      style={{ "--cell-color": color }}
                    >
                      {!isEditing ? (
                        <button
                          className="num-display"
                          onClick={() => {
                            setEditingCell(key);
                            requestAnimationFrame(() => {
                              if (editableRef.current) {
                                editableRef.current.textContent =
                                  initialTextFromRaw(rec?.valueRaw);
                                placeCaretAtEnd(editableRef.current);
                              }
                            });
                          }}
                          title="Click to edit amount"
                        >
                          {typeof rec?.valueRaw === "number" &&
                          rec.valueRaw > 0 ? (
                            <span
                              className="cell-num"
                              style={{ color }}
                            >
                              {displayFromRaw(rec.valueRaw)}
                            </span>
                          ) : (
                            <span className="cell-num empty">&nbsp;</span>
                          )}
                        </button>
                      ) : (
                        <span
                          ref={editableRef}
                          className="cell-editable cell-num typing"
                          style={{ color }}
                          role="textbox"
                          contentEditable
                          suppressContentEditableWarning
                          spellCheck={false}
                          onInput={(e) => {
                            const sanitized = sanitizeToOneDecimal(
                              e.currentTarget.textContent || ""
                            );
                            if (
                              (e.currentTarget.textContent || "") !==
                              sanitized
                            ) {
                              e.currentTarget.textContent = sanitized;
                              placeCaretAtEnd(e.currentTarget);
                            }
                          }}
                          onBlur={(e) =>
                            commitAmount(habit, utcMidnightMs, e.currentTarget)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitAmount(
                                habit,
                                utcMidnightMs,
                                e.currentTarget
                              );
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              setEditingCell(null);
                            }
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {open && (
        <div className="row-desc-layout">
          <div className="row-desc-main">
            <div className="kv" onDoubleClick={() => setEditingQ(true)}>
              <div className="kv-label">Question</div>
              {!editingQ ? (
                <div
                  className="kv-value"
                  style={{ whiteSpace: "pre-wrap" }}
                >
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
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        saveQ();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setEditingQ(false);
                        setQDraft(habit.question || "");
                      }
                    }}
                    rows={Math.min(
                      6,
                      Math.max(
                        2,
                        (qDraft.match(/\n/g)?.length || 0) + 1
                      )
                    )}
                    placeholder="Type question… (⌘/Ctrl+Enter to save, Esc to cancel)"
                  />
                  <div className="desc-actions">
                    <button onClick={saveQ}>Save</button>
                    <button
                      onClick={() => {
                        setEditingQ(false);
                        setQDraft(habit.question || "");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="kv" onDoubleClick={() => setEditingD(true)}>
              <div className="kv-label">Description</div>
              {!editingD ? (
                <div
                  className="kv-value"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {(habit.description &&
                    habit.description.trim()) || "—"}
                </div>
              ) : (
                <div className="desc-editor">
                  <textarea
                    ref={dRef}
                    value={dDraft}
                    onChange={(e) => setDDraft(e.target.value)}
                    onBlur={saveD}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        saveD();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setEditingD(false);
                        setDDraft(habit.description || "");
                      }
                    }}
                    rows={Math.min(
                      6,
                      Math.max(
                        2,
                        (dDraft.match(/\n/g)?.length || 0) + 1
                      )
                    )}
                    placeholder="Type description… (⌘/Ctrl+Enter to save, Esc to cancel)"
                  />
                  <div className="desc-actions">
                    <button onClick={saveD}>Save</button>
                    <button
                      onClick={() => {
                        setEditingD(false);
                        setDDraft(habit.description || "");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="row-desc-actions">
            {!habit.archived ? (
              <button
                className="action-btn warn"
                title="Archive this habit"
                onClick={(e) => {
                  e.stopPropagation();
                  const ok = window.confirm(
                    `Archive “${habit.name}”? You can restore it later.`
                  );
                  if (ok) onArchive?.(habit.id);
                }}
              >
                Archive
              </button>
            ) : (
              <button
                className="action-btn"
                title="Restore this habit"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnarchive?.(habit.id);
                }}
              >
                Restore
              </button>
            )}

            <div className="actions-spacer" />
          </div>
        </div>
      )}
    </div>
  );
}
