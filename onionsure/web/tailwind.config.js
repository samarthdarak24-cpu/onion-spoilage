export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#0B5D3B',
        darkgreen: '#06452C',
        fresh: '#3FAE5A',
        cream: '#F7F5EA',
        amber: '#F4B942',
        reject: '#D9534F',
        // iBank-style design tokens
        bg: '#F7F7F5',
        surface: '#FFFFFF',
        ink: '#17161D',
        muted: '#85838A',
        'dark-1': '#111019',
        'dark-2': '#1A1822',
        border: 'rgba(20,20,25,0.08)',
        mint: '#DDF5E8',
        'mint-deep': '#BFE8CF',
        'soft-blue': '#E4EDF9',
        'soft-peach': '#F9E9DD',
        'soft-lavender': '#ECEAF8',
        sb: {
          50: '#F0F9F2', 100: '#E2F3E6', 200: '#C6E7CE', 300: '#9DD4AC',
          400: '#6FBC85', 500: '#3FAE5A', 600: '#2F8E47', 700: '#226E37',
          800: '#174D27', 900: '#0D2D18',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl2': '22px',
        'xl3': '28px',
        'xl4': '34px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20,20,25,0.04), 0 8px 24px rgba(20,20,25,0.05)',
        card: '0 1px 2px rgba(20,20,25,0.04), 0 12px 32px rgba(20,20,25,0.06)',
        ring: '0 0 0 1px rgba(20,20,25,0.06)',
        // keep legacy
        legacy: '0 12px 30px -12px rgba(6,69,44,0.28)',
        legacyCard: '0 4px 20px -8px rgba(6,69,44,0.18)',
      },
      keyframes: {
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pulseRing: { '0%': { transform: 'scale(0.8)', opacity: '0.7' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        scan: 'scan 2.4s ease-in-out infinite',
        floaty: 'floaty 4s ease-in-out infinite',
        pulseRing: 'pulseRing 1.8s ease-out infinite',
        fadeUp: 'fadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};
