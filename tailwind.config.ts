import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:        '#7C3D6E',   // deep rose-mauve
          'blue-mid':  '#B06497',   // mid rose
          'blue-light':'#F8EDF5',   // blush tint
        },
        accent: {
          amber:        '#5A7A2E',   // earthy green-gold
          'amber-mid':  '#84B041',   // bright leaf
          'amber-light':'#EEF6E0',   // pale sage
        },
        success: {
          DEFAULT: '#3B6D11',
          bg:      '#EAF3DE',
        },
        danger: {
          DEFAULT: '#A32D2D',
          bg:      '#FCEBEB',
        },
        warning: {
          DEFAULT: '#854F0B',
          bg:      '#FAEEDA',
        },
        slate: {
          50:  '#F8F9FB',
          100: '#EEF0F4',
          200: '#D9DCE4',
          600: '#5F6575',
          800: '#1E2333',
        },
      },
      fontFamily: {
        sans: ['Cormorant Garamond', 'Georgia', 'serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        'sans-ui': ['Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display': ['22px', { lineHeight: '1.3', fontWeight: '500' }],
        'section':  ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        'body':     ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'secondary':['13px', { lineHeight: '1.6', fontWeight: '400' }],
        'label':    ['11px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      spacing: {
        '4.5': '18px',
      },
    },
  },
  plugins: [],
}

export default config
