# Scrollbar

The ultra-thin custom scrollbar used across this dashboard.
Defined globally in [app/globals.css](../app/globals.css) — no per-component classes needed;
any element with `overflow-y-auto` gets it automatically.

## Look

- **4px wide** — a hairline, not a gutter
- **Thumb**: foreground color at 10% opacity, fully rounded (pill shape) — barely-there
  gray that works in both light and dark mode since it derives from `--foreground`
- **Track**: invisible — painted the same color as the surface it sits on
  (`--background` for the page, `--sidebar` inside the sidebar nav)
- No arrows/buttons, no borders

## Example

```css
::-webkit-scrollbar {
  width: 4px;  /* vertical scrollbars */
  height: 4px; /* horizontal scrollbars */
}

::-webkit-scrollbar-thumb {
  background: color-mix(in oklab, var(--foreground) 10%, transparent);
  border-radius: 10px;
}

::-webkit-scrollbar-track {
  background: var(--background);
}

/* track must match the surface it scrolls over — sidebar nav sits on --sidebar */
aside nav::-webkit-scrollbar-track {
  background: var(--sidebar);
}
```

## Rules

- The thumb color is **derived, not hardcoded**: `color-mix` of `--foreground` at 10%
  into transparent, so it adapts to theme changes automatically.
- The track always matches its surface color, making it invisible — only the thumb shows.
  If a new scroll container sits on a different background (e.g. a card), add a matching
  `::-webkit-scrollbar-track` override for it, like the `aside nav` one.
- `::-webkit-scrollbar` only affects Chromium/Safari/Edge. Firefox ignores it — if Firefox
  support matters, add `scrollbar-width: thin; scrollbar-color: <thumb> transparent;`
  as the equivalent.
