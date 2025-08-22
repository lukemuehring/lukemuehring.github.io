/** @type {import('tailwindcss').Config} */

export default {
  theme: {
    extend: {
      letterSpacing: {
        tight: "-0.15em",
      },
      fontFamily: {
        helvetica: ["Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
};
