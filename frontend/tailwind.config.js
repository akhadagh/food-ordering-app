/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // --- Afia Food Hub brand palette (see BRAND_GUIDELINES.md §3) ---
        // Afia Clay - primary: warm terracotta red from Ghanaian clay cookware
        clay: {
          50: '#FEF4F1', 100: '#FCE5DF', 200: '#F8C9BE', 300: '#F2A493',
          400: '#E37F69', 500: '#C4422B', 600: '#A8341F', 700: '#8A2B1A',
          800: '#702519', 900: '#5C2117',
        },
        // Garden - secondary: Ghana green, freshness and trust
        garden: {
          50: '#F0F7F1', 100: '#DDEDDF', 200: '#BBDCC1', 300: '#8EC39A',
          400: '#5BA56E', 500: '#2F7A46', 600: '#256139', 700: '#1E4F30',
          800: '#193F27', 900: '#143320',
        },
        // Kola Gold - accent: golden highlights, prices and badges
        gold: {
          50: '#FEF9E9', 100: '#FDF0C6', 200: '#FBE18C', 300: '#F8CE52',
          400: '#F0B824', 500: '#DE9710', 600: '#B87606', 700: '#96600A',
          800: '#7A4D0B', 900: '#64400D',
        },
        // Bamboo - warm neutrals
        bamboo: {
          0: '#FFFFFF', 50: '#FAF8F5', 100: '#F4F1EC', 200: '#E8E3DB',
          300: '#D5CEC3', 400: '#B0A698', 500: '#8A8073', 600: '#6B6257',
          700: '#544D45', 800: '#3A352F', 900: '#26221E',
        },
        // Danger - reserved for destructive and error states
        danger: {
          50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5',
          400: '#F87171', 500: '#DC2626', 600: '#B91C1C', 700: '#991B1B',
          800: '#7F1D1D', 900: '#6B1616',
        },
        // --- semantic aliases used throughout the app ---
        primary: {
          DEFAULT: '#C4422B', 50: '#FEF4F1', 100: '#FCE5DF', 200: '#F8C9BE',
          300: '#F2A493', 400: '#E37F69', 500: '#C4422B', 600: '#A8341F',
          700: '#8A2B1A', 800: '#702519', 900: '#5C2117',
        },
        secondary: {
          DEFAULT: '#256139', 50: '#F0F7F1', 100: '#DDEDDF', 200: '#BBDCC1',
          300: '#8EC39A', 400: '#5BA56E', 500: '#2F7A46', 600: '#256139',
          700: '#1E4F30', 800: '#193F27', 900: '#143320',
        },
        accent: {
          DEFAULT: '#DE9710', 50: '#FEF9E9', 100: '#FDF0C6', 200: '#FBE18C',
          300: '#F8CE52', 400: '#F0B824', 500: '#DE9710', 600: '#B87606',
          700: '#96600A', 800: '#7A4D0B', 900: '#64400D',
        },
        surface: '#FFFFFF',
        background: '#FAF8F5',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '3.75rem', letterSpacing: '-0.02em' }],
        'display-lg': ['2.625rem', { lineHeight: '3rem', letterSpacing: '-0.015em' }],
        'display-md': ['2rem', { lineHeight: '2.5rem' }],
        'display-sm': ['1.5rem', { lineHeight: '2rem' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.625rem' }],
        'body-sm': ['0.84375rem', { lineHeight: '1.25rem' }],
      },
      borderRadius: {
        card: '1rem',
        control: '0.75rem',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(38, 34, 30, 0.04), 0 1px 3px rgba(38, 34, 30, 0.06)',
        'card-hover': '0 8px 24px rgba(38, 34, 30, 0.10), 0 2px 6px rgba(38, 34, 30, 0.06)',
        brand: '0 6px 20px rgba(196, 66, 43, 0.28)',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #C4422B 0%, #A8341F 55%, #702519 100%)',
        'brand-dark':
          'linear-gradient(160deg, #3A352F 0%, #26221E 100%)',
      },
      maxWidth: {
        measure: '68ch',
      },
      keyframes: {
        'steam-rise': {
          '0%': { opacity: '0', transform: 'translateY(6px) scaleY(0.6)' },
          '40%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-14px) scaleY(1.1)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'steam-rise': 'steam-rise 2.4s ease-in-out infinite',
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
