// src/palette.js
export const PALETTE = {
  0:  "#C46A1B",
  1:  "#F4C542",
  2:  "#1ABC9C",
  3:  "#FFD54F",
  4:  "#2E7D32",
  5:  "#48C9B0",
  6:  "#58D68D",
  7:  "#2ECC71",
  8:  "#5A6AE6",
  9:  "#5DADE2",
  10: "#2E86C1",
  11: "#3498DB",
  12: "#34495E",
  13: "#E056FD",
  14: "#8E44AD",
  15: "#FF6B81",
};

export function getColorHex(idx) {
  const n = Number.isFinite(idx) ? idx : -1;
  return PALETTE[n] || "#999999";
}

export function lighten(hex, amount = 0.35) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const to = (c) => {
    const v = Math.round(parseInt(c, 16) + (255 - parseInt(c, 16)) * amount);
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  };
  return `#${to(m[1])}${to(m[2])}${to(m[3])}`;
}
