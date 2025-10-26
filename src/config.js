// src/config.js
// One place to control where the frontend sends API requests.
// Falls back to 8080 by default so dev "just works" even if .env isn't picked up.
export const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) ||
  "http://localhost:8080";
