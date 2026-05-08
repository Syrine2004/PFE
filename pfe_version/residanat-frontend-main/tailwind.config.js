/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        ministry: '#2389a8',
        header: '#cfe0ed',
        primary: {
          dark: '#1a3a5c',
          teal: '#2389a8',
        }
      }
    },
  },
  plugins: [],
}
