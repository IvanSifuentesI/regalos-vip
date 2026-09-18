import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        skool: {
          bg: "#f3f4f6",
          card: "#ffffff",
          border: "#e5e7eb",
          text: "#111827",
          muted: "#6b7280",
          blue: "#2563eb",
          "blue-dark": "#1d4ed8",
          yellow: "#f59e0b",
          green: "#10b981",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
