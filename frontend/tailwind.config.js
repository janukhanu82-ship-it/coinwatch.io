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
        terminal: {
          bg: '#080A0F',
          dark: '#0E121B',
          card: '#131824',
          hover: '#1A2132',
          border: '#1E2638',
          text: '#E2E8F0',
          muted: '#8B949E',
          green: '#00F5A0',
          red: '#FF3B69',
          yellow: '#FFB800',
          cyan: '#00E5FF'
        },
        exchange: {
          hl: '#2FE4AB',
          binance: '#F3BA2F',
          bybit: '#F7A600'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
