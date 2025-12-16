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
        // Univrs.io organic bioluminescence palette - CSS variable based for theme switching
        void: 'var(--void)',
        'deep-earth': 'var(--deep-earth)',
        'forest-floor': 'var(--forest-floor)',
        moss: 'var(--moss)',
        bark: 'var(--bark)',
        // Bioluminescent accents
        glow: {
          cyan: 'var(--glow-cyan)',
          'cyan-dim': 'var(--glow-cyan-dim)',
          gold: 'var(--glow-gold)',
          'gold-dim': 'var(--glow-gold-dim)',
        },
        spore: {
          purple: 'var(--spore-purple)',
        },
        mycelium: {
          white: 'var(--mycelium-white)',
        },
        'soft-gray': 'var(--soft-gray)',
        'border-subtle': 'var(--border-subtle)',
        // Legacy mycelial palette for compatibility
        mycelial: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: 'var(--glow-cyan)',
          500: '#00b8a0',
          600: '#008b75',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        surface: {
          dark: 'var(--void)',
          DEFAULT: 'var(--deep-earth)',
          light: 'var(--forest-floor)',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Crimson Pro', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-bg': 'pulse-bg 20s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 255, 213, 0.25), 0 0 10px rgba(0, 255, 213, 0.25)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 255, 213, 0.25), 0 0 30px rgba(0, 255, 213, 0.25)' },
        },
        'pulse-bg': {
          '0%': { opacity: '0.4', transform: 'scale(1)' },
          '100%': { opacity: '0.7', transform: 'scale(1.1)' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(0, 255, 213, 0.25)',
        'glow-md': '0 0 20px rgba(0, 255, 213, 0.25), 0 0 40px rgba(0, 255, 213, 0.25)',
        'glow-lg': '0 0 30px rgba(0, 255, 213, 0.25), 0 0 60px rgba(0, 255, 213, 0.25), 0 0 90px rgba(0, 255, 213, 0.25)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
