/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'purple-bg': '#381C46',
        'primary': '#6F3E87',
        'primary-dark': '#5b3370',
        'secondary': '#C59AF4'
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        satoshi: ['Satoshi', 'sans-serif']
      }
    }
  },
  plugins: [
    require('flowbite/plugin')
  ]
};
