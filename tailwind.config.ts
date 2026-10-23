import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          sand: "#FAF9F5",
          charcoal: "#1F1E1D",
          surface: {
            light: "#FFFFFF",
            lightAlt: "#FBFBF9",
            dark: "#2A2826",
            darkAlt: "#252321",
          },
          border: {
            light: "#E5E3DC",
            dark: "#3A3834",
          },
          text: {
            ink: "#1F1E1D",
            cream: "#ECEAE4",
            mutedLight: "#6F6D66",
            mutedDark: "#9B988F",
          },
          terracotta: {
            DEFAULT: "#CC5A37",
            hover: "#B84E2E",
            tint: "#F7ECE6",
            darkTint: "#3D241C",
          },
          amber: {
            DEFAULT: "#D97706",
            hover: "#B45309",
          },
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Consolas", "Courier New", "monospace"],
      },
      boxShadow: {
        warm: "0 2px 10px -2px rgba(31, 30, 29, 0.05), 0 1px 3px -1px rgba(31, 30, 29, 0.03)",
        warmLg: "0 10px 25px -5px rgba(31, 30, 29, 0.08), 0 8px 10px -6px rgba(31, 30, 29, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
