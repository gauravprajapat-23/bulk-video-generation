import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0D11",
        panel: "#12151B",
        panel2: "#171B22",
        border: "#262B34",
        text: "#E7ECF2",
        muted: "#8B96A5",
        accent: "#7C5CFC",
        accent2: "#FFB454",
        good: "#3FB967",
        bad: "#F0594B",
      },
      fontFamily: {
        sora: ["var(--font-sora)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        panel: "0 8px 30px rgba(0,0,0,0.45)",
      },
      borderRadius: {
        xl2: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
