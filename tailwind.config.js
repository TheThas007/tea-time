/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cream: "#FAF7F0",
          ivory: "#FFFCF6",
          espresso: "#2C190E",
          text: "#301C10",
          muted: "#8A6A53",
          tan: "#DFC9AC",
          gold: "#E8B64F",
          primary: "#4A290F",
          "primary-hover": "#623B1B",
          focus: "#C99532",
          // Legacy aliases mapped to new premium palette
          yellow: "#E8B64F",
          "yellow-hover": "#C99532",
          "yellow-light": "#FAF7F0",
          charcoal: "#2C190E",
          "charcoal-dark": "#23130A",
          "charcoal-light": "#3D2415",
          surface: "#FAF7F0",
          "surface-alt": "#F4EFE4",
          border: "#DFC9AC",
        }
      },
      boxShadow: {
        warm: "0 2px 10px -2px rgba(44, 25, 14, 0.07), 0 1px 4px -1px rgba(44, 25, 14, 0.04)",
        "warm-md": "0 6px 16px -3px rgba(44, 25, 14, 0.10), 0 2px 6px -2px rgba(44, 25, 14, 0.06)",
        "warm-lg": "0 12px 28px -4px rgba(44, 25, 14, 0.16), 0 4px 10px -2px rgba(44, 25, 14, 0.08)",
        "warm-xl": "0 20px 36px -6px rgba(44, 25, 14, 0.24), 0 8px 14px -4px rgba(44, 25, 14, 0.12)",
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ]
      }
    },
  },
  plugins: [],
}
