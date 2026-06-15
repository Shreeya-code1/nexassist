import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.tsx", "./components/**/*.tsx", "./lib/**/*.ts"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        "background-secondary": "hsl(var(--background-secondary))",
        foreground: "hsl(var(--foreground))",
        "foreground-muted": "hsl(var(--foreground-muted))",
        card: "hsl(var(--card))",
        "card-hover": "hsl(var(--card-hover))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        "primary-glow": "hsl(var(--primary-glow))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        warning: "hsl(var(--warning))",
        "warning-foreground": "hsl(var(--warning-foreground))",
        success: "hsl(var(--success))",
        "success-foreground": "hsl(var(--success-foreground))",
        border: "hsl(var(--border))",
        "border-glow": "hsl(var(--border-glow))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        sidebar: "hsl(var(--sidebar))",
        "sidebar-foreground": "hsl(var(--sidebar-foreground))",
        "sidebar-muted": "hsl(var(--sidebar-muted))",
        "sidebar-active": "hsl(var(--sidebar-active))",
        "sidebar-border": "hsl(var(--sidebar-border))",
        space: {
          950: "#020408",
          900: "#050810",
          800: "#0a1020",
          700: "#111827"
        },
        violet: {
          glow: "#7c3aed"
        },
        cyan: {
          glow: "#06b6d4"
        },
        fest: {
          pink: "hsl(var(--fest-pink))",
          orange: "hsl(var(--fest-orange))",
          violet: "hsl(var(--fest-violet))",
          cyan: "hsl(var(--fest-cyan))"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["var(--font-space-grotesk)", "Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        none: "0px",
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        full: "9999px"
      },
      boxShadow: {
        "glow-violet": "0 0 20px rgba(124,58,237,0.4)",
        "glow-cyan": "0 0 20px rgba(6,182,212,0.3)",
        "glow-sm": "0 0 8px rgba(124,58,237,0.3)",
        "glow-pink": "0 0 24px rgba(236,72,153,0.45)",
        "glow-fest": "0 0 30px rgba(124,58,237,0.35), 0 0 60px rgba(236,72,153,0.2)"
      }
    }
  },
  plugins: []
};

export default config;
