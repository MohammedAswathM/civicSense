/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy civic-blue kept for backwards compat with existing components
        civic: {
          blue: '#1A56DB',
          'blue-dark': '#1341B0',
          'blue-light': '#EBF5FF',
        },
        // New civic-trust palette
        ink: {
          DEFAULT: '#13261F',
          900: '#0D1B16',
          700: '#1E362C',
          500: '#3C5048',
          300: '#7A8B83',
        },
        paper: {
          DEFAULT: '#FAF7F0',
          100: '#FFFFFF',
          200: '#F3EEE2',
          300: '#E8E1D0',
        },
        signal: {
          DEFAULT: '#E8A33D',
          50: '#FDF3E2',
          100: '#FAE6C2',
          600: '#C9821F',
          700: '#A8690F',
        },
        trust: {
          DEFAULT: '#1F8A5F',
          50: '#E8F5EE',
          100: '#CBEADA',
          600: '#16704A',
          700: '#0F5837',
        },
        alarm: {
          DEFAULT: '#C23B2E',
          50: '#FBE9E6',
          100: '#F4C7C0',
          600: '#A12E23',
        },
        // Status semantic aliases
        status: {
          open: '#C23B2E',
          progress: '#E8A33D',
          resolved: '#1F8A5F',
          escalated: '#13261F',
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
        display: ['Source Serif 4', 'Georgia', 'serif'],
        tabular: ['IBM Plex Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(19,38,31,0.06)',
        'card-hover': '0 4px 12px rgba(19,38,31,0.12), 0 2px 4px rgba(19,38,31,0.08)',
        'blue-glow': '0 0 0 4px rgba(26,86,219,0.15)',
        notice: '0 1px 2px rgba(19,38,31,0.06)',
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'slide-up': 'slide-up 0.3s ease-out both',
        'check-pop': 'check-pop 0.5s cubic-bezier(.34,1.56,.64,1) both',
        'ring-spin': 'ring-spin 1s linear infinite',
        shimmer: 'shimmer 1.5s infinite',
        beacon: 'beacon 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'check-pop': {
          '0%':   { transform: 'scale(0) rotate(-15deg)', opacity: '0' },
          '60%':  { transform: 'scale(1.15) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'ring-spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        shimmer: { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
        beacon: {
          '0%, 100%': { boxShadow: '0 0 0 0 currentColor' },
          '50%': { boxShadow: '0 0 0 6px transparent' },
        },
      },
    },
  },
  plugins: [],
};
