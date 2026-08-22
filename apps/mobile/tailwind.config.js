/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#208AEF",
          dark: "#0F6BC7",
          soft: "#E8F2FE",
        },
      },
    },
  },
  plugins: [],
};
