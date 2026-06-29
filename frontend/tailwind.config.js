/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#09090b', // Zinc 950
          card: '#18181b', // Zinc 900
          border: '#27272a', // Zinc 800
          text: '#f4f4f5', // Zinc 100
          muted: '#a1a1aa' // Zinc 400
        },
        emerald: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        teal: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185', // Rose Red
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        zinc: {
          50: '#09090b',   // Darkest text (Zinc-950 level)
          100: '#18181b',  // Dark text (Zinc-900 level)
          200: '#27272a',  // Medium-dark text
          300: '#3f3f46',
          400: '#52525b',  // Body text
          500: '#71717a',  // Muted text
          600: '#a1a1aa',  // Muted light text
          700: '#d4d4d8',  // Very light text / borders
          800: '#e4e4e7',  // Light borders (Zinc-200 level)
          900: '#f4f4f5',  // Card backgrounds (Zinc-100 level)
          950: '#ffffff',  // Primary white backgrounds (Zinc-50 level)
        }
      },
      boxShadow: {
        glow: '0 0 15px rgba(239, 68, 68, 0.25)', // Red glow
        'glow-high': '0 0 20px rgba(239, 68, 68, 0.4)',
        'glow-primary': '0 0 20px rgba(239, 68, 68, 0.15)' // Light red glow
      }
    },
  },
  plugins: [],
}
