module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./pages/**/*.{js,jsx,ts,tsx,mdx}",
    "./components/**/*.{js,jsx,ts,tsx,mdx}"
  ],
  theme: {
    extend: {
      keyframes: {
        "hero-glow": {
          "0%,100%": {
            "text-shadow": "0 0 10px rgba(168,85,247,.45),0 0 26px rgba(99,102,241,.38),0 0 56px rgba(99,102,241,.22)",
            filter: "drop-shadow(0 0 12px rgba(168,85,247,.18))"
          },
          "50%": {
            "text-shadow": "0 0 14px rgba(168,85,247,.65),0 0 34px rgba(99,102,241,.55),0 0 76px rgba(99,102,241,.3)",
            filter: "drop-shadow(0 0 20px rgba(168,85,247,.28))"
          }
        },
        pulseSoft: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.5" }
        }
      },
      animation: {
        "hero-glow": "hero-glow 3.2s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s infinite"
      }
    }
  },
  plugins: []
}
