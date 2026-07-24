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
          50: '#f5f3ff',
          100: '#edd8ff',
          200: '#dbb8ff',
          300: '#c58fff',
          400: '#a85eff',
          500: '#8b2eff', // Primary brand purple
          600: '#7118eb',
          700: '#580db8',
          800: '#41098c',
          900: '#2b0561',
        },
        slate: {
          950: '#0b0f19', // Sleek dark body background
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
