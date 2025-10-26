const KEY = "habitEdits";

export function loadEdits() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveEdits(edits) {
  localStorage.setItem(KEY, JSON.stringify(edits || {}));
}
