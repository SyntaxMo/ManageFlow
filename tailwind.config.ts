import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#082F93",
        background: "#F4F8F9",
        ink: "#212328",
        muted: "#8395BD",
        deep: "#1F3B80",
        border: "#BFC9DC",
        accent: "#4B629D",
      },
      boxShadow: {
        panel: "0 14px 45px rgba(31, 59, 128, 0.09)",
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
