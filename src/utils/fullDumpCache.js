const KEY = "loop_full_dump_json";

export function loadDump() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function saveDump(dump) {
  try {
    localStorage.setItem(KEY, JSON.stringify(dump));
  } catch {
    // ignore quota errors
  }
}

export function clearDump() {
  localStorage.removeItem(KEY);
}
