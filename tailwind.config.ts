import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		// Geist Pixel is NOT undersized like the previous pixel face was:
  		// measured cap-height at a common px size (canvas ctx.measureText,
  		// 'H' at 100px) is 72.2px for Geist Pixel vs 56px for the old face
  		// (ratio 0.722 vs 0.56). Geist already reads ~29% fuller at an
  		// identical declared size than the old face did at its x1.25 boost.
  		// So the boost is dropped entirely: this is Tailwind's stock default
  		// scale, untouched, with only a 16px floor for mobile legibility
  		// (down from the old 20px floor, scaled proportionally:
  		// 20 * 0.56/0.722 = 15.5, rounded to 16).
  		// Arbitrary values (text-[13px]) can't be reached from here; those
  		// are remapped in src/index.css.
  		fontSize: {
  			xs: ['16px', { lineHeight: '1.5' }],
  			sm: ['16px', { lineHeight: '1.5' }],
  			base: ['16px', { lineHeight: '1.6' }],
  			lg: ['18px', { lineHeight: '1.55' }],
  			xl: ['20px', { lineHeight: '1.5' }],
  			'2xl': ['24px', { lineHeight: '1.4' }],
  			'3xl': ['30px', { lineHeight: '1.3' }],
  			'4xl': ['36px', { lineHeight: '1.2' }],
  			'5xl': ['48px', { lineHeight: '1.1' }],
  			'6xl': ['60px', { lineHeight: '1.05' }],
  			'7xl': ['72px', { lineHeight: '1' }],
  			'8xl': ['96px', { lineHeight: '1' }],
  			'9xl': ['128px', { lineHeight: '1' }],
  		},
  		fontFamily: {
  			display: [
  				'Geist Pixel',
  				'sans-serif'
  			],
  			mono: [
  				'Geist Pixel',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			],
  			clinical: [
  				'Geist Pixel',
  				'monospace'
  			],
  			sans: [
  				'Geist Pixel',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif',
  				'Apple Color Emoji',
  				'Segoe UI Emoji',
  				'Segoe UI Symbol',
  				'Noto Color Emoji'
  			],
  			serif: [
  				'Geist Pixel',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				legible: 'hsl(var(--primary-legible))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			neon: {
  				red: 'hsl(var(--primary))',
  				cyan: 'hsl(var(--accent))',
  				magenta: 'hsl(var(--neon-magenta))'
  			},
  			cathode: 'hsl(var(--cathode))',
			graphite: 'hsl(var(--graphite))',
			gunmetal: 'hsl(var(--gunmetal))',
			slate: 'hsl(var(--slate))',
			fog: 'hsl(var(--fog))',
			haze: 'hsl(var(--haze))',
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'glitch-1': {
  				'0%, 100%': {
  					clipPath: 'inset(20% 0 40% 0)',
  					transform: 'translateX(-3px)'
  				},
  				'50%': {
  					clipPath: 'inset(50% 0 10% 0)',
  					transform: 'translateX(3px)'
  				}
  			},
  			'glitch-2': {
  				'0%, 100%': {
  					clipPath: 'inset(60% 0 5% 0)',
  					transform: 'translateX(3px)'
  				},
  				'50%': {
  					clipPath: 'inset(10% 0 70% 0)',
  					transform: 'translateX(-3px)'
  				}
  			},
  			scan: {
  				'0%': {
  					transform: 'translateY(-100%)'
  				},
  				'100%': {
  					transform: 'translateY(100vh)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.6s ease-out forwards',
  			'glitch-1': 'glitch-1 0.3s steps(2) infinite',
  			'glitch-2': 'glitch-2 0.3s steps(2) infinite',
  			scan: 'scan 8s linear infinite'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
