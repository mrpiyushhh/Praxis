/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
        "surface-container-lowest": "#0b0e14",
        "on-primary": "#3c0091",
        "surface-variant": "#32353c",
        "on-error-container": "#ffdad6",
        "on-surface": "#e1e2eb",
        "tertiary-container": "#00a38d",
        "primary-fixed-dim": "#d0bcff",
        "surface-tint": "#d0bcff",
        "surface-container": "#1d2026",
        "secondary": "#a5e7ff",
        "on-background": "#e1e2eb",
        "tertiary": "#00dfc1",
        "outline": "#958ea0",
        "tertiary-fixed": "#26fedc",
        "on-surface-variant": "#cbc3d7",
        "secondary-fixed-dim": "#47d6ff",
        "outline-variant": "#494454",
        "primary-fixed": "#e9ddff",
        "inverse-primary": "#6d3bd7",
        "on-secondary-fixed": "#001f28",
        "background": "#10131a",
        "on-secondary-container": "#00566a",
        "surface-container-low": "#191c22",
        "on-primary-container": "#340080",
        "surface-container-high": "#272a31",
        "on-secondary-fixed-variant": "#004e60",
        "on-primary-fixed": "#23005c",
        "on-primary-fixed-variant": "#5516be",
        "on-tertiary-fixed": "#00201a",
        "error": "#ffb4ab",
        "on-secondary": "#003543",
        "secondary-container": "#00d2ff",
        "surface-dim": "#10131a",
        "on-tertiary-fixed-variant": "#005144",
        "on-error": "#690005",
        "surface": "#10131a",
        "on-tertiary-container": "#003028",
        "surface-bright": "#363940",
        "on-tertiary": "#00382f",
        "inverse-on-surface": "#2e3037",
        "tertiary-fixed-dim": "#00dfc1",
        "secondary-fixed": "#b6ebff",
        "inverse-surface": "#e1e2eb",
        "primary-container": "#a078ff",
        "error-container": "#93000a",
        "primary": "#d0bcff",
        "surface-container-highest": "#32353c"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      "spacing": {
        "gutter": "24px",
        "container-padding-mobile": "16px",
        "stack-sm": "8px",
        "container-padding-desktop": "32px",
        "stack-md": "16px",
        "base": "8px",
        "stack-lg": "24px"
      },
      "fontFamily": {
        "label-lg": ["Plus Jakarta Sans", "sans-serif"],
        "body-md": ["Plus Jakarta Sans", "sans-serif"],
        "headline-md": ["Plus Jakarta Sans", "sans-serif"],
        "body-sm": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg-mobile": ["Plus Jakarta Sans", "sans-serif"],
        "label-sm": ["Plus Jakarta Sans", "sans-serif"],
        "headline-xl": ["Plus Jakarta Sans", "sans-serif"],
        "headline-sm": ["Plus Jakarta Sans", "sans-serif"],
        "body-lg": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg": ["Plus Jakarta Sans", "sans-serif"]
      },
      "fontSize": {
        "label-lg": ["14px", {"lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "600"}],
        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
        "headline-md": ["24px", {"lineHeight": "32px", "fontWeight": "600"}],
        "body-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "headline-lg-mobile": ["28px", {"lineHeight": "34px", "fontWeight": "700"}],
        "label-sm": ["12px", {"lineHeight": "14px", "letterSpacing": "0.04em", "fontWeight": "500"}],
        "headline-xl": ["40px", {"lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "headline-sm": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}],
        "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "700"}]
      },
      "animation": {
        "fade-up": "fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "pulse-slow": "pulseSlow 12s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate"
      },
      "keyframes": {
        "fadeUp": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "pulseSlow": {
          "0%, 100%": { transform: "scale(1) translate(0, 0)", opacity: "0.15" },
          "50%": { transform: "scale(1.1) translate(2%, 2%)", opacity: "0.25" }
        },
        "glow": {
          "from": { "box-shadow": "0 0 10px rgba(208, 188, 255, 0.2)" },
          "to": { "box-shadow": "0 0 20px rgba(208, 188, 255, 0.5)" }
        }
      }
    },
  },
  plugins: [],
}
