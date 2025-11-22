module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6D28D9',
        accent: '#0EA5E9',
        slate: {
          900: '#0f172a',
        },
        purple: {
          900: '#3f0d6b'
        },
        yellow: {
          400: '#f59e0b'
        },
        orange: {
          500: '#f97316'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif']
      }
    }
  },
  plugins: []
}
