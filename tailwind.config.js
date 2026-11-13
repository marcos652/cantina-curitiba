/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Classes montadas dinamicamente em Button.tsx (`btn-${variant}`, `btn-${size}`).
  safelist: ['btn-primary', 'btn-secondary', 'btn-ghost', 'btn-danger', 'btn-sm', 'btn-md', 'btn-lg', 'btn-icon'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#1A1A1A',
        muted: '#6B6B6B',
        faint: '#9A9A9A',
        line: '#EAEAEA',
        soft: '#FAFAFA',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        ok: '#16A34A',
        'ok-soft': '#F0FDF4',
        warn: '#CA8A04',
        'warn-soft': '#FEFCE8',
        danger: '#DC2626',
        'danger-soft': '#FEF2F2',
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
      },
    },
  },
  plugins: [],
}
