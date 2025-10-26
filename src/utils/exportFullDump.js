// Build a round-trip JSON by replacing only the tables you modified (e.g., Habits).
export function deepClone(obj) {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

/**
 * @param {object} originalDump - full backup { schema, tables, data }
 * @param {object} updatedDataByTable - e.g. { Habits: [ ...rows... ] }
 */
export function serializeFullDump(originalDump, updatedDataByTable) {
  if (!originalDump || !originalDump.schema || !originalDump.tables || !originalDump.data) {
    throw new Error("serializeFullDump: invalid originalDump (expected {schema, tables, data}).");
  }
  const out = deepClone({
    schema: originalDump.schema,
    tables: originalDump.tables,
    data: originalDump.data,
  });

  if (updatedDataByTable && typeof updatedDataByTable === "object") {
    for (const [tableName, rows] of Object.entries(updatedDataByTable)) {
      if (!Array.isArray(rows)) continue;
      if (!Object.prototype.hasOwnProperty.call(out.data, tableName)) continue;
      out.data[tableName] = deepClone(rows);
    }
  }

  return out;
}
