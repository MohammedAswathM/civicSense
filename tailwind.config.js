/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        civic: {
          blue: '#1A56DB',
          'blue-dark': '#1341B0',
          'blue-light': '#EBF5FF',
        },
        status: {
          open: '#E02424',
          progress: '#FF8800',
          resolved: '#057A55',
          escalated: '#1C1C1E',
        },
        severity: {
          1: '#9CA3AF',
          2: '#60A5FA',
          3: '#F59E0B',
          4: '#EF4444',
          5: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
        'blue-glow': '0 0 0 4px rgba(26,86,219,0.15)',
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'slide-up': 'slide-up 0.3s ease-out both',
        'check-pop': 'check-pop 0.5s cubic-bezier(.34,1.56,.64,1) both',
        'ring-spin': 'ring-spin 1s linear infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'check-pop': {
          '0%':   { transform: 'scale(0) rotate(-15deg)', opacity: '0' },
          '60%':  { transform: 'scale(1.15) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'ring-spin': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
    },
  },
  plugins: [],
};
