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
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
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
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0, 0, 0, 0.04)",
        dialog:
          "0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: {
          DEFAULT: "hsl(var(--border) / <alpha-value>)",
          subtle: "var(--border-subtle)",
        },
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        surface: {
          DEFAULT: "var(--surface)",
          subtle: "var(--surface-subtle)",
          muted: "var(--surface-muted)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--ink)",
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
