import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:    '#1428A0',
        'navy-light': '#1e35cc',
        blue: {
          DEFAULT: '#2563eb',
          dark:    '#1d4ed8',
          light:   '#eff6ff',
          mid:     '#dbeafe',
        },
        green: {
          DEFAULT: '#16a34a',
          bg:      '#dcfce7',
        },
        red: {
          DEFAULT: '#dc2626',
          bg:      '#fef2f2',
        },
        yellow: '#f59e0b',
        purple: {
          DEFAULT: '#7c3aed',
          bg:      '#f5f3ff',
        },
        bg:     '#ffffff',
        bg2:    '#f8fafc',
        bg3:    '#eef2ff',
        border: '#e2e8f0',
        text: {
          DEFAULT: '#0f172a',
          2:       '#334155',
          muted:   '#64748b',
        },
      },
      fontFamily: {
        bebas: ['var(--font-bebas)', 'cursive'],
        syne:  ['var(--font-syne)',  'sans-serif'],
        dm:    ['var(--font-dm)',    'sans-serif'],
        sans:  ['var(--font-dm)',    'sans-serif'],
      },
      borderRadius: {
        sm:  '12px',
        DEFAULT: '18px',
        lg:  '24px',
        xl:  '32px',
      },
      boxShadow: {
        sm:  '0 2px 8px rgba(15,23,42,.06)',
        DEFAULT: '0 8px 32px rgba(15,23,42,.08)',
        lg:  '0 20px 60px rgba(15,23,42,.12)',
        blue: '0 4px 16px rgba(37,99,235,.3)',
        'blue-lg': '0 8px 24px rgba(37,99,235,.4)',
      },
      backgroundImage: {
        'cta-gradient': 'linear-gradient(135deg, #1428A0, #2563eb)',
        'hero-gradient': 'linear-gradient(135deg, rgba(20,40,160,.95) 0%, rgba(37,99,235,.9) 100%)',
        'score-gradient': 'linear-gradient(90deg, #1428A0, #2563eb)',
      },
      animation: {
        'spin-slow': 'spin 1.2s linear infinite',
        'slide-up':  'slideUp .3s ease',
        'fade-in':   'fadeIn .2s ease',
        'pulse-cta': 'pulseCta 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp:  { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeIn:   { from: { opacity: '0', transform: 'scale(.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseCta: { '0%,100%': { boxShadow: '0 4px 16px rgba(37,99,235,.3)' }, '50%': { boxShadow: '0 8px 32px rgba(37,99,235,.6)' } },
      },
    },
  },
  plugins: [],
};

export default config;
