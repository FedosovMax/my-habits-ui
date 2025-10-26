// src/retention.js
export function normalizeTs(epoch) {
  const n = Number(epoch);
  return n < 100000000000 ? n * 1000 : n; // seconds -> ms
}
export function isoDayUTC(epochMs) {
  const d = new Date(epochMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function classifyStatus(habit, valueRaw) {
  const type = Number(habit?.type ?? 0);
  const raw = Number.isFinite(valueRaw) ? valueRaw : 0;
  if (type === 0) return raw >= 2 ? { status: "done" } : { status: "missed" };
  const tgt = Number(habit?.targetValue ?? 0);
  const thr = Math.round(tgt * 1000);
  if (tgt > 0) return raw >= thr ? { status: "done" } : raw > 0 ? { status: "partial" } : { status: "missed" };
  return raw > 0 ? { status: "done" } : { status: "missed" };
}
export function buildRetentionMap(habits, repetitions) {
  const byId = new Map((habits || []).map(h => [h.id, h]));
  const agg = {};
  for (const r of (repetitions || [])) {
    const id = r.habit ?? r.habitId ?? r.habit_id ?? r.habitID;
    if (id == null) continue;
    const h = byId.get(id); if (!h) continue;
    const tsMs = normalizeTs(r.timestamp ?? r.ts ?? r.time);
    const key = isoDayUTC(tsMs);
    const raw = Number(r.value ?? r.valueRaw ?? 0);
    (agg[id] ||= {});
    const prev = agg[id][key]?.valueRaw ?? 0;
    if ((h.type ?? 0) === 0) {
      agg[id][key] = { valueRaw: Math.max(prev, raw) }; // boolean: max
    } else {
      agg[id][key] = { valueRaw: prev + raw }; // numeric: sum
    }
  }
  const out = {};
  for (const [id, days] of Object.entries(agg)) {
    const h = byId.get(Number(id)); out[id] = {};
    for (const [day, obj] of Object.entries(days)) {
      out[id][day] = { ...classifyStatus(h, obj.valueRaw), valueRaw: obj.valueRaw };
    }
  }
  return out;
}
