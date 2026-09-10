/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif:   ['DM Serif Display', 'Georgia', 'serif'],
        arabic:  ['Noto Kufi Arabic', 'DM Sans', 'sans-serif'],
      },
      colors: {
        /* Accent palette — indigo-toned classic */
        accent: {
          50:  '#f2f1fa',
          100: '#e5e3f5',
          200: '#cbc8ec',
          300: '#aaa5df',
          400: '#8b87d0',
          500: '#5b5ea6',
          600: '#4a4d8f',
          700: '#3c3e74',
          800: '#2f305c',
          900: '#22234a',
        },
        /* Warm sand / parchment */
        warm: {
          50:  '#faf7f2',
          100: '#f5f0e8',
          200: '#ede4d3',
          300: '#ddd0ba',
          400: '#c8b896',
          500: '#b09870',
          600: '#907850',
          700: '#6e5c3a',
          800: '#4e4028',
          900: '#32281a',
        },
        /* Deep espresso (sidebar) */
        espresso: {
          50:  '#f2ede6',
          100: '#e0d5c6',
          200: '#c0aa8e',
          300: '#a08060',
          400: '#7a5e3a',
          500: '#5a4020',
          600: '#3e2c12',
          700: '#2b2419',
          800: '#1e1912',
          900: '#110e09',
        },
        /* Sage green accent */
        sage: {
          50:  '#f2f5f0',
          100: '#e2ead8',
          200: '#c4d5b1',
          300: '#9fbb85',
          400: '#7ea05e',
          500: '#607b56',
          600: '#4d6344',
          700: '#3b4c34',
          800: '#2a3625',
          900: '#1a2218',
        },
      },
      borderRadius: {
        'xs':  '6px',
        'sm':  '10px',
        'DEFAULT': '13px',
        'md':  '13px',
        'lg':  '17px',
        'xl':  '20px',
        '2xl': '26px',
        '3xl': '32px',
      },
      boxShadow: {
        'warm-xs': '0 1px 3px rgba(60,40,10,0.04)',
        'warm-sm': '0 1px 4px rgba(60,40,10,0.05), 0 1px 2px rgba(60,40,10,0.03)',
        'warm':    '0 4px 16px rgba(60,40,10,0.07), 0 2px 6px rgba(60,40,10,0.04)',
        'warm-md': '0 6px 24px rgba(60,40,10,0.08), 0 3px 8px rgba(60,40,10,0.05)',
        'warm-lg': '0 12px 40px rgba(60,40,10,0.09), 0 4px 12px rgba(60,40,10,0.05)',
        'warm-xl': '0 20px 64px rgba(60,40,10,0.11), 0 8px 24px rgba(60,40,10,0.06)',
        'card':    '0 2px 8px rgba(60,40,10,0.06), 0 1px 3px rgba(60,40,10,0.04)',
        'inner-warm': 'inset 0 1px 3px rgba(60,40,10,0.06)',
      },
      transitionTimingFunction: {
        'out-expo':   'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quart':  'cubic-bezier(0.25, 1, 0.5, 1)',
        'in-out-sine':'cubic-bezier(0.37, 0, 0.63, 1)',
      },
      animation: {
        'fade-in':   'fadeIn .4s ease-out both',
        'slide-up':  'slideUp .45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in':  'scaleIn .35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'float':     'float 3s ease-in-out infinite',
      },
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
        '13':  '52px',
        '15':  '60px',
        '18':  '72px',
      },
      lineHeight: {
        'cozy': '1.7',
      },
      letterSpacing: {
        'label': '0.08em',
        'wide+': '0.06em',
      },
    },
  },
  plugins: [],
}
