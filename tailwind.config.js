/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        ui: ['DM Sans', 'system-ui', 'sans-serif'],
        title: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        base: '#0A0B10',
        surface: '#12141C',
        elevated: '#1A1D28',
        hover: '#1E2130',
        'input-bg': '#0F1117',
        'border-subtle': '#1E2130',
        'border-default': '#2A2D3E',
        'border-focus': '#6366F1',
        'text-primary': '#E8EAF0',
        'text-secondary': '#9EA3B5',
        'text-muted': '#4E5268',
        'text-code': '#7DD3FC',
        accent: {
          amber: '#F59E0B',
          indigo: '#6366F1',
          green: '#10B981',
          red: '#EF4444',
          yellow: '#EAB308',
          purple: '#8B5CF6',
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
