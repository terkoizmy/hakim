/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          0: 'var(--bg-0)',
          1: 'var(--bg-1)',
          2: 'var(--bg-2)',
          3: 'var(--bg-3)',
          4: 'var(--bg-4)',
        },
        line: {
          0: 'var(--line-0)',
          1: 'var(--line-1)',
          2: 'var(--line-2)',
        },
        brass: {
          100: 'var(--brass-100)',
          200: 'var(--brass-200)',
          300: 'var(--brass-300)',
          400: 'var(--brass-400)',
          500: 'var(--brass-500)',
          600: 'var(--brass-600)',
          700: 'var(--brass-700)',
        },
        prosecute: {
          100: 'var(--prosecute-100)',
          300: 'var(--prosecute-300)',
          400: 'var(--prosecute-400)',
          500: 'var(--prosecute-500)',
          600: 'var(--prosecute-600)',
        },
        defend: {
          100: 'var(--defend-100)',
          300: 'var(--defend-300)',
          400: 'var(--defend-400)',
          500: 'var(--defend-500)',
          600: 'var(--defend-600)',
        },
        'accent-blue': {
          300: 'var(--accent-blue-300)',
          500: 'var(--accent-blue-500)',
          600: 'var(--accent-blue-600)',
        },
        rich: {
          a: 'var(--rich-a)',
          b: 'var(--rich-b)',
          c: 'var(--rich-c)',
        },
        cache: {
          hit: 'var(--cache-hit)',
          miss: 'var(--cache-miss)',
        },
        text: {
          0: 'var(--text-0)',
          1: 'var(--text-1)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        '1': 'var(--shadow-1)',
        '2': 'var(--shadow-2)',
        '3': 'var(--shadow-3)',
        brass: 'var(--shadow-brass)',
      },
      maxWidth: {
        content: 'var(--content-max)',
      },
      keyframes: {
        spin: { to: { transform: 'rotate(360deg)' } },
        'dot-pulse': {
          '0%': { boxShadow: '0 0 0 0 var(--brass-glow)' },
          '70%': { boxShadow: '0 0 0 7px transparent' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.35)', opacity: '0.7' },
        },
        'skeleton-shimmer': {
          from: { backgroundPosition: '120% 0' },
          to: { backgroundPosition: '-120% 0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        dotty: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-3px)', opacity: '1' },
        },
        livebar: {
          '0%': { left: '-42%' },
          '100%': { left: '100%' },
        },
        'strip-slide': {
          from: { backgroundPosition: '120% 0' },
          to: { backgroundPosition: '-120% 0' },
        },
        'acard-pulse': {
          '0%, 100%': {
            boxShadow:
              '0 0 0 1px rgba(var(--agent), 0.12) inset, 0 0 26px -8px rgba(var(--agent), 0.45)',
          },
          '50%': {
            boxShadow:
              '0 0 0 1px rgba(var(--agent), 0.2) inset, 0 0 34px -6px rgba(var(--agent), 0.65)',
          },
        },
      },
      animation: {
        spin: 'spin 0.8s linear infinite',
        'spin-slow': 'spin 1.1s linear infinite',
        'dot-pulse': 'dot-pulse 1.4s var(--ease-in-out) infinite',
        'pulse-dot': 'pulse-dot 1.4s var(--ease-in-out) infinite',
        'skeleton-shimmer': 'skeleton-shimmer 1.4s infinite linear',
        'fade-in': 'fade-in var(--dur-med) var(--ease-out) both',
        'fade-in-up': 'fade-in-up var(--dur-med) var(--ease-out) both',
        'fade-in-up-slow': 'fade-in-up var(--dur-slow) var(--ease-out) both',
        'scale-in': 'scale-in var(--dur-med) var(--ease-out) both',
        blink: 'blink 0.95s steps(2) infinite',
        dotty: 'dotty 1.2s infinite',
        livebar: 'livebar 1.6s var(--ease-in-out) infinite',
        'strip-slide': 'strip-slide 3.4s var(--ease-in-out) infinite',
        'acard-pulse': 'acard-pulse 2.4s var(--ease-in-out) infinite',
      },
    },
  },
  plugins: [],
};