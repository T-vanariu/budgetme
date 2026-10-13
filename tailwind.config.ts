import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Blueprint 3.4: mobile ≤700, tablet 701–1100, desktop ≥1101
    screens: { md: '701px', xl: '1101px' },
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        ink: 'var(--ink)',
        onink: 'var(--onink)',
        needs: 'var(--needs)',
        wants: 'var(--wants)',
        save: 'var(--save)',
        over: 'var(--over)',
        track: 'var(--track)',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '16px', ctl: '10px' },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [animate],
} satisfies Config;
