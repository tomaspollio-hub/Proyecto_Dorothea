import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F3EEFB',
          400: '#9C7CD3',
          500: '#7855C0',
          600: '#6040A8',
          700: '#4C2F92',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
