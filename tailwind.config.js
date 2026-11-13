/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Classes montadas dinamicamente em Button.tsx (`btn-${variant}`, `btn-${size}`).
  safelist: ['btn-primary', 'btn-soft', 'btn-secondary', 'btn-ghost', 'btn-danger', 'btn-sm', 'btn-md', 'btn-lg', 'btn-icon'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ground: '#F4F6F9',
        raised: '#F8F9FB',
        line: '#E3E6EB',
        rule: '#EEF0F3',
        control: '#D3D8DF',
        ink: '#1B2430',
        muted: '#5B6775',
        faint: '#6F7B89',
        accent: '#1565D8',
        'accent-hover': '#1052B0',
        'accent-soft': '#E8F1FD',
        ok: '#16A34A',
        'ok-text': '#15803D',
        'ok-soft': '#ECFDF3',
        warn: '#F59E0B',
        'warn-text': '#B45309',
        'warn-soft': '#FFFBEB',
        danger: '#DC2626',
        'danger-text': '#B91C1C',
        'danger-soft': '#FEF2F2',
        notice: '#FFF9DB',
        'notice-border': '#F1E2A4',
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '14px',
      },
    },
  },
  plugins: [],
}
