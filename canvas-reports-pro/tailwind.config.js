/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          ink: '#1f2933',
          blue: '#0770B8',
          green: '#047857',
          gold: '#b7791f',
          red: '#b91c1c',
        },
      },
      boxShadow: {
        panel: '0 18px 48px rgba(31, 41, 51, 0.22)',
      },
    },
  },
  plugins: [],
};
