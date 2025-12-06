import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--goat-editor-background, 0 0% 100%))",
        foreground: "hsl(var(--goat-editor-foreground, 0 0% 3.9%))",
        card: {
          DEFAULT: "hsl(var(--goat-editor-card, 0 0% 100%))",
          foreground: "hsl(var(--goat-editor-card-foreground, 0 0% 3.9%))",
        },
        popover: {
          DEFAULT: "hsl(var(--goat-editor-popover, 0 0% 100%))",
          foreground: "hsl(var(--goat-editor-popover-foreground, 0 0% 3.9%))",
        },
        primary: {
          DEFAULT: "hsl(var(--goat-editor-primary, 0 0% 9%))",
          foreground: "hsl(var(--goat-editor-primary-foreground, 0 0% 98%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--goat-editor-secondary, 0 0% 96.1%))",
          foreground: "hsl(var(--goat-editor-secondary-foreground, 0 0% 9%))",
        },
        muted: {
          DEFAULT: "hsl(var(--goat-editor-muted, 0 0% 96.1%))",
          foreground: "hsl(var(--goat-editor-muted-foreground, 0 0% 45.1%))",
        },
        accent: {
          DEFAULT: "hsl(var(--goat-editor-accent, 0 0% 96.1%))",
          foreground: "hsl(var(--goat-editor-accent-foreground, 0 0% 9%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--goat-editor-destructive, 0 84.2% 60.2%))",
          foreground:
            "hsl(var(--goat-editor-destructive-foreground, 0 0% 98%))",
        },
        border: "hsl(var(--goat-editor-border, 0 0% 89.8%))",
        input: "hsl(var(--goat-editor-input, 0 0% 89.8%))",
        ring: "hsl(var(--goat-editor-ring, 0 0% 3.9%))",
      },
      borderRadius: {
        lg: "var(--goat-editor-radius, 0.5rem)",
        md: "calc(var(--goat-editor-radius, 0.5rem) - 2px)",
        sm: "calc(var(--goat-editor-radius, 0.5rem) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

