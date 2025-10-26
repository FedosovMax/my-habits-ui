

/**
 * Normalize various color inputs to a #RRGGBB hex string.
 * Supports:
 *  - '#RRGGBB', '#RGB', '#AARRGGBB' (alpha ignored)
 *  - '0xAARRGGBB' or '0xRRGGBB'
 *  - integers (Android ARGB/RGB; negative ints OK)
 *  - 'rgb(r,g,b)' strings
 *  - arrays [r,g,b]
 *  - objects {r,g,b} or {red,green,blue}
 */
export function pickColor(input) {
  const fallback = '#3aa675';
  if (input == null) return fallback;

  const clamp = (n) => Math.max(0, Math.min(255, Number(n) || 0));
  const toHex = (r, g, b) =>
    '#' + ((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1);

  // Number (incl. signed Android ints)
  if (typeof input === 'number') {
    const n = input >>> 0;              // unsigned
    const rgb = n & 0xFFFFFF;           // drop alpha if present
    return '#' + rgb.toString(16).padStart(6, '0');
  }

  if (Array.isArray(input) && input.length >= 3) {
    const [r, g, b] = input;
    return toHex(r, g, b);
  }

  if (typeof input === 'object') {
    const r = input.r ?? input.red;
    const g = input.g ?? input.green;
    const b = input.b ?? input.blue;
    if (r != null && g != null && b != null) return toHex(r, g, b);
  }

  if (typeof input === 'string') {
    let s = input.trim();

    // rgb(...) string
    const m = s.match(/rgb\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)/i);
    if (m) return toHex(m[1], m[2], m[3]);

    // 0xAARRGGBB or 0xRRGGBB
    if (/^0x[0-9a-f]{8}$/i.test(s) || /^0x[0-9a-f]{6}$/i.test(s)) {
      const hex = s.replace(/^0x/i, '');
      return '#' + hex.slice(-6);
    }

    // #AARRGGBB, #RRGGBB, #RGB
    if (/^#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})$/i.test(s)) {
      if (s.length === 9) return '#' + s.slice(3); // drop alpha
      return s;
    }

    // plain decimal string like "16711680"
    if (/^\\d+$/.test(s)) {
      const n = parseInt(s, 10) >>> 0;
      return '#' + (n & 0xFFFFFF).toString(16).padStart(6, '0');
    }
  }

  return fallback;
}


// Date helpers (local timezone, ISO YYYY-MM-DD)
export function pad(n){ return n < 10 ? '0'+n : ''+n }

export function formatISODate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate())
}

export const isSameISO = (a, b) => formatISODate(a) === formatISODate(b);

export function todayISO() {
  const d = new Date()
  return formatISODate(d)
}

export function startOfWeek(date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // Mon=0
  d.setDate(d.getDate() - day)
  d.setHours(0,0,0,0)
  return d
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function eachDay(start, end) {
  const days = []
  const d = new Date(start)
  d.setHours(0,0,0,0)
  const last = new Date(end)
  last.setHours(0,0,0,0)
  while (d <= last) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

// Accepts a variety of JSON shapes and normalizes to:
//   [{ id, name, color, archived, frequency:{times,period}, repetitions:["YYYY-MM-DD", ...] }]
export function parseHabitsFromAny(data) {
  let habits = []
  if (Array.isArray(data)) habits = data
  else if (data?.habits) habits = data.habits
  else if (data?.data?.habits) habits = data.data.habits
  else habits = []

  return habits.map((h, idx) => normalizeHabit(h, idx))
}

function normalizeHabit(h, idx) {
  const id = h.id ?? idx
  const name = h.name ?? h.title ?? `Habit #${idx+1}`
  const color = pickColor(h.color || h.colour || h.color_rgb)
  const archived = !!(h.archived ?? h.is_archived ?? false)
  const frequency = normalizeFrequency(h.frequency || h.freq || h.target)
  const reps = normalizeRepetitions(h.repetitions || h.checks || h.entries || h.history || [])
  return { id, name, color, archived, frequency, repetitions: reps }
}

function normalizeFrequency(f) {
  if (!f) return { times: 1, period: 'day' }
  if (typeof f === 'string') return { times: 1, period: f }
  if (typeof f === 'number') return { times: f, period: 'day' }
  const times = f.times ?? f.count ?? 1
  const period = f.period ?? f.every ?? 'day'
  return { times, period }
}

function normalizeRepetitions(rep) {
  // rep can be: array of dates; object { "YYYY-MM-DD": true }; array of {date, done}
  const out = []
  if (Array.isArray(rep)) {
    for (const v of rep) {
      if (!v) continue
      if (typeof v === 'string') out.push(v.slice(0,10))
      else if (typeof v === 'object' && v.date) out.push(String(v.date).slice(0,10))
      else if (typeof v === 'number') {
        // treat as epoch seconds or ms if big
        const d = new Date(v < 1e12 ? v * 1000 : v)
        out.push(formatISODate(d))
      }
    }
  } else if (rep && typeof rep === 'object') {
    for (const [k, val] of Object.entries(rep)) {
      if (val) out.push(String(k).slice(0,10))
    }
  }
  // unique + sort
  return Array.from(new Set(out)).sort()
}


// Compute current and best streak from sorted ISO dates
export function computeStreaks(isoDates) {
  if (!isoDates || isoDates.length === 0) return { current: 0, best: 0 }
  let best = 1, cur = 1, currentStreak = 0
  for (let i = 1; i < isoDates.length; i++) {
    const prev = new Date(isoDates[i-1])
    const now = new Date(isoDates[i])
    const diff = (now - prev) / (1000*60*60*24)
    if (diff === 1) { cur += 1; best = Math.max(best, cur) } else { cur = 1 }
  }
  // current streak = streak up to today (inclusive) if last date is today; otherwise count back from last date consecutively
  const today = new Date()
  const todayIso = formatISODate(today)
  let k = isoDates.length - 1
  currentStreak = 1
  while (k > 0) {
    const a = new Date(isoDates[k])
    const b = new Date(isoDates[k-1])
    const diff = (a - b) / (1000*60*60*24)
    if (diff === 1) { currentStreak += 1; k -= 1 } else break
  }
  return { current: currentStreak, best }
}
