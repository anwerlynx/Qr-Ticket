import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Apple Design System Tokens
        apple: {
          blue: "#0066cc",
          "blue-focus": "#0071e3",
          "blue-dark": "#2997ff",
          ink: "#1d1d1f",
          canvas: "#ffffff",
          parchment: "#f5f5f7",
          pearl: "#fafafc",
          tile1: "#272729",
          tile2: "#2a2a2c",
          hairline: "#e5e5e7",
          divider: "#f0f0f0",
          muted: "#86868b",
        },
        // NextGen Event Identity
        nextgen: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#8a38f5", // Official NextGen primary purple from Figma
          600: "#7c22e8",
          700: "#6917c9",
          800: "#5513a0",
          900: "#3d0b74",
          950: "#220448",
        },
      },
      fontFamily: {
        sf: ["SF Pro Display", "SF Pro Text", "-apple-system", "BlinkMacSystemFont", "Inter", "system-ui", "sans-serif"],
        arabic: ["Cairo", "Tajawal", "SF Pro Text", "system-ui", "sans-serif"],
        mono: ["SF Mono", "ui-monospace", "'Courier New'", "monospace"],
      },
      borderRadius: {
        apple: "18px",
      },
      boxShadow: {
        product: "0 8px 32px rgba(0, 0, 0, 0.10)",
        subtle: "0 2px 8px rgba(0, 0, 0, 0.04)",
      },
      letterSpacing: {
        tightest: "-0.374px",
        tight: "-0.28px",
      },
    },
  },
  plugins: [heroui()],
};
export default config;
