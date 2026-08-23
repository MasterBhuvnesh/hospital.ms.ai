import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Geist", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Geist Mono", "monospace"],
      },
      fontSize: {
        display: ["32px", { lineHeight: "1.15" }],
        "heading-1": ["26px", { lineHeight: "1.2" }],
        "heading-2": ["22px", { lineHeight: "1.25" }],
        "heading-3": ["18px", { lineHeight: "1.3" }],
        "heading-4": ["16px", { lineHeight: "1.35" }],
        "body-large": ["15px", { lineHeight: "1.5" }],
        body: ["14px", { lineHeight: "1.55" }],
        "body-small": ["13px", { lineHeight: "1.5" }],
        label: ["12px", { lineHeight: "1.4" }],
        caption: ["11px", { lineHeight: "1.35" }],
      },
      fontWeight: {
        normal: "350",
        medium: "450",
        semibold: "500",
        bold: "600",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0, 0, 0, 0.04)",
        dialog:
          "0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
      },
      ringWidth: {
        3: "3px",
      },
      colors: {
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
        },
        border: {
          DEFAULT: "oklch(var(--border) / <alpha-value>)",
          subtle: "var(--border-subtle)",
        },
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        "comp-border": "var(--comp-border)",
        cta: {
          DEFAULT: "oklch(var(--cta) / <alpha-value>)",
          foreground: "oklch(var(--cta-foreground) / <alpha-value>)",
        },
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
        surface: {
          DEFAULT: "var(--surface)",
          subtle: "var(--surface-subtle)",
          muted: "var(--surface-muted)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--ink)",
          border: "var(--sidebar-border)",
        },
        ink: "var(--ink)",
        subtle: "var(--subtle-foreground)",
        danger: {
          DEFAULT: "var(--danger)",
          foreground: "var(--danger-foreground)",
          background: "var(--danger-background)",
          border: "var(--danger-border)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
          background: "var(--success-background)",
          border: "var(--success-border)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
          background: "var(--warning-background)",
          border: "var(--warning-border)",
        },
        info: {
          DEFAULT: "var(--info)",
          foreground: "var(--info-foreground)",
          background: "var(--info-background)",
          border: "var(--info-border)",
        },
      },
      transitionDuration: {
        120: "120ms",
        160: "160ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
