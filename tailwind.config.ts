import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#06080b",
          900: "#090c11",
          850: "#0c1118",
          800: "#10161f",
          750: "#141c26",
          700: "#1a2431",
          600: "#243140"
        },
        lime: {
          300: "#d9ff7a",
          400: "#c6ff4a",
          500: "#b4f22e"
        },
        mint: {
          300: "#7ff5df",
          400: "#4ae3c6",
          500: "#25c7ab"
        },
        amber: {
          400: "#ffbd5c",
          500: "#f5a623"
        },
        coral: {
          400: "#ff7c6b",
          500: "#f2553f"
        },
        fog: {
          100: "#eef4f8",
          200: "#d5e0e9",
          300: "#aab8c5",
          400: "#8495a5",
          500: "#647586",
          600: "#475665"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(198, 255, 74, 0.4)",
        panel: "0 20px 50px -30px rgba(0, 0, 0, 0.9)"
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" }
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        }
      },
      animation: {
        fadeUp: "fadeUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite",
        scan: "scan 3.2s linear infinite",
        shimmer: "shimmer 1.8s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
