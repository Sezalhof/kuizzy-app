// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],  // Keep this broader file matching
  theme: {
    extend: {
      // Keep your custom animations
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        shake: "shake 0.5s ease-in-out",
      },
      
      // You could optionally add these recommended defaults:
      colors: {
        primary: {
          DEFAULT: '#2563eb',  // blue-600
          light: '#3b82f6',    // blue-500
        },
      },
    },
  },
  plugins: [
    // Optional but useful plugins:
    require('@tailwindcss/forms'),  // Better form styling
    require('@tailwindcss/typography'),  // Better prose content
  ],
};