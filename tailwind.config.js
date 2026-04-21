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
        'background': '#F2F5F3', /* A slight tinted bg to make the 60% prominent white glass cards pop */
        'white': '#FFFFFF',
        'primary': '#046241',
        'primary-hover': '#034A31',
        'accent': '#FFC370',
        'accent-hover': '#EAB266',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'border-color': 'rgba(4, 98, 65, 0.1)',
        'icon-bg': 'rgba(255, 195, 112, 0.2)', /* Using accent for icon backgrounds to bring up the 10% */
        'input-bg': '#FFFFFF',
        'destructive': '#EF4444',
        'destructive-hover': '#DC2626',
        'destructive-bg': 'rgba(239, 68, 68, 0.1)',
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
