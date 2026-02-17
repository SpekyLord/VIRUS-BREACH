/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#0a0a0f',
          green: '#00ff41',
          cyan: '#00d4ff',
          red: '#ff0040',
          orange: '#ff6600',
          purple: '#bf00ff',
          yellow: '#ffdd00',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Orbitron"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
