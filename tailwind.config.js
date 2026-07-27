/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        delphi: {
          bg: '#f0f2f5',
          card: '#ffffff',
          header: '#1e293b',
          accent: '#2563eb',
          active: '#3b82f6',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b',
          darkBg: '#0f172a',
          darkCard: '#1e293b',
          darkBorder: '#334155'
        }
      }
    },
  },
  plugins: [],
}
