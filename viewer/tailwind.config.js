/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#e50914',
          600: '#b81d24',
          700: '#831010',
        },
        cinema: {
          800: '#1e2029',
          850: '#141721',
          900: '#0b0e17',
          950: '#05070c',
        }
      }
    },
  },
  plugins: [],
}
