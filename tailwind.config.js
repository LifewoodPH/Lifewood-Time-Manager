/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        'background': '#F9FAFB',
        'white': '#FFFFFF',
        'primary': '#046241',
        'primary-hover': '#057A55',
        'accent': '#FFB347',
        'accent-hover': '#FFC370',
        'text-primary': '#1F2937',
        'text-secondary': '#6B7281',
        'border-color': '#E5E7EB',
        'icon-bg': 'rgba(4, 98, 65, 0.1)',
        'input-bg': '#F3EFE0',
        'destructive': '#DC2626',
        'destructive-hover': '#B91C1C',
        'destructive-bg': 'rgba(220, 38, 38, 0.1)',
      },
      animation: {
        'fade-in-scale': 'fadeInScale 0.3s ease-out forwards',
      },
      keyframes: {
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      }
    }
  },
  plugins: [],
}
