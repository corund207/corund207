// Tokens from the Apple-Style Design System (dark first, light for GitHub's light mode).
// Every SVG in assets/ is generated from these values; edit here, then run build-art.mjs.

export const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const MONO = "'SFMono-Regular', ui-monospace, Menlo, Monaco, Consolas, monospace";

export const themes = {
  dark: {
    id: "dark",
    background: "#000000",
    surface: "#1d1d1f",
    surfaceSoft: "#161617",
    well: "#000000",
    foreground: "#f5f5f7",
    foregroundSoft: "#d2d2d7",
    foregroundBright: "#ffffff",
    muted: "#86868b",
    accent: "#2997ff",
    accentBright: "#64b5ff",
    action: "#0071e3",
    onAction: "#ffffff",
    line: "rgba(245, 245, 247, 0.17)",
    lineStrong: "rgba(245, 245, 247, 0.27)",
    lineControl: "rgba(245, 245, 247, 0.42)",
    hoverWash: "rgba(245, 245, 247, 0.06)",
    dotInk: "#f5f5f7",
    dotEnergy: "#2997ff",
  },
  light: {
    id: "light",
    background: "#ffffff",
    surface: "#f5f5f7",
    surfaceSoft: "#fbfbfd",
    well: "#e8e8ed",
    foreground: "#1d1d1f",
    foregroundSoft: "#424245",
    foregroundBright: "#000000",
    muted: "#6e6e73",
    accent: "#0066cc",
    accentBright: "#0071e3",
    action: "#0071e3",
    onAction: "#ffffff",
    line: "rgba(0, 0, 0, 0.12)",
    lineStrong: "rgba(0, 0, 0, 0.2)",
    lineControl: "rgba(29, 29, 31, 0.45)",
    hoverWash: "rgba(0, 0, 0, 0.05)",
    dotInk: "#1d1d1f",
    dotEnergy: "#0066cc",
  },
};

// Motion tokens.
export const ease = {
  reveal: "cubic-bezier(0.215, 0.61, 0.355, 1)",
  row: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
};

export const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
