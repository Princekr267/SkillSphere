import tailwindcssAnimate from 'tailwindcss-animate';

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
        cream: {
          DEFAULT: 'var(--color-cream)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
        },
        accent: {
          amber: 'var(--color-accent-amber)',
          teal: 'var(--color-accent-teal)',
          coral: 'var(--color-accent-coral)',
          pink: 'var(--color-accent-pink)',
        },
        textOn: {
          amber: 'var(--color-text-on-amber)',
          teal: 'var(--color-text-on-teal)',
          coral: 'var(--color-text-on-coral)',
          pink: 'var(--color-text-on-pink)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      borderRadius: {
        xl: '16px',
        lg: '12px',
      },
      borderWidth: {
        thick: '3px',
      },
      boxShadow: {
        'retro': '4px 4px 0px 0px var(--color-ink)',
        'retro-sm': '2px 2px 0px 0px var(--color-ink)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(15px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
  ],
}
