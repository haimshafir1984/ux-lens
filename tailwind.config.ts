import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8fafc",
        foreground: "#0f172a",
        muted: "#eef2ff",
        border: "#e2e8f0",
        accent: "#2563eb",
        critical: "#ef4444",
        warning: "#f59e0b",
        good: "#22c55e"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(37,99,235,0.16), 0 12px 30px rgba(37,99,235,0.12)"
      }
    }
  },
  plugins: []
};

export default config;
