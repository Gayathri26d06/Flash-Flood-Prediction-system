/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        void: {
          DEFAULT: '#0A0D12',
          soft: '#0D1117',
        },
        panel: {
          DEFAULT: '#12161D',
          raised: '#1A1F28',
          border: '#232A35',
        },
        ink: {
          DEFAULT: '#E6EAF0',
          muted: '#8189A0',
          faint: '#525A6B',
        },
        signal: {
          DEFAULT: '#2DD4E8',
          dim: '#1A6B78',
        },
        risk: {
          low: '#34D399',
          moderate: '#FBBF24',
          high: '#FB923C',
          critical: '#F0473F',
        },
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(45,212,232,0.25), 0 0 24px -4px rgba(45,212,232,0.35)',
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.8' },
          '70%': { transform: 'scale(1.9)', opacity: '0' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'pulse-ring': 'pulseRing 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite',
        sweep: 'sweep 2.2s linear infinite',
        blink: 'blink 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
