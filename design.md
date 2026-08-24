# Design System Reference — Hospital Management System

This document defines the visual design for the Hospital Management System, derived from the
reference screenshots in [`ui_photos/`](ui_photos/).

> Colors below were extracted directly from the reference images by pixel sampling.
> Where a color is taken from a specific photo, the source filename is noted.

## Reference Screens

| File | Likely screen | Palette signature |
|------|---------------|-------------------|
| `ui_photos/133b6877-6f26-46b9-b625-2e16c171b80d.jpg` | Dashboard / home (square, 736×736) | White + warm off-white surfaces, earthy tan/brown accents |
| `ui_photos/7f3439a5-0ca5-47f1-8551-4584b1a28fc8.jpg` | Stats / charts view (portrait, 735×905) | White surfaces, dark text, green/amber/red status + light cyan |
| `ui_photos/f26e4436-fb26-4176-b843-4c506d44f645.jpg` | Auth / landing (landscape, 735×544) | Light neutral surfaces, olive-lime primary, deep forest green |

---

## Color Palette

### Primary — Olive / Lime Green

Used for primary actions, active states, links, highlights.
Derived from `f26e4436-fb26-4176-b843-4c506d44f645.jpg`.

| Token | Value | Notes |
|-------|-------|-------|
| `primary-50` | `#F4F8E3` | Tint / hover backgrounds |
| `primary-100` | `#E2EDB8` | Tint backgrounds |
| `primary-300` | `#B9CC5A` | Light accents |
| `primary-500` | `#A2B440` | **Primary / brand green** |
| `primary-600` | `#92AA22` | Hover state |
| `primary-700` | `#6E7F14` | Pressed state |
| `primary-900` | `#345208` | Dark green (deep tones) |
| `primary-950` | `#0C2408` | Deepest green (footer / dark surfaces) |

### Neutrals — Surfaces & Text

| Token | Value | Notes |
|-------|-------|-------|
| `surface-0` | `#FFFFFF` | Main background (all screens) |
| `surface-50` | `#FCFCFC` | Card background |
| `surface-100` | `#F4F4F4` | Subtle background / input fill |
| `surface-200` | `#F0F0F0` | Secondary surface |
| `surface-300` | `#E8E8E8` | Borders / dividers (light) |
| `surface-warm` | `#F0F0EC` | Warm off-white surface (from 133b6877) |
| `text-700` | `#303030` | Body text / headings (from 7f3439a5) |
| `text-900` | `#161616` | Headings / emphasis |
| `text-muted` | `#A0A0A0` | Placeholder / secondary text |

### Warm Earthy Accents (secondary accent family)

Derived from `133b6877-6f26-46b9-b625-2e16c171b80d.jpg`. Use sparingly for cards, illustrations,
avatars, or "earthy" sections.

| Token | Value | Notes |
|-------|-------|-------|
| `earth-300` | `#C4A48C` | Light tan |
| `earth-500` | `#947460` | Mid brown-tan |
| `earth-700` | `#806450` | Darker brown |

### Semantic / Status Colors

Derived from `7f3439a5-0ca5-47f1-8551-4584b1a28fc8.jpg` (chart/status screen).

| Token | Value | Usage |
|-------|-------|-------|
| `success` | `#58C050` | Positive / confirmed / available |
| `success-bg` | `#D0ECCC` | Success chip background |
| `warning` | `#F8BE52` | Pending / warning |
| `warning-bg` | `#F8F2D8` | Warning chip background |
| `danger` | `#E86858` | Error / urgent / unavailable |
| `danger-bg` | `#F0BEB4` | Error chip background |
| `info` | `#40B0D8` | Informational |
| `info-bg` | `#D6FCFC` | Info chip background |

---

## Typography

Primary font: **Inter** (already used in `mobile/` via `@expo-google-fonts/inter`).

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Display / page title | 28–32px | 700 | `text-900` |
| Section heading | 20–24px | 600 | `text-900` |
| Card title | 16–18px | 600 | `text-900` |
| Body | 14–16px | 400 | `text-700` |
| Label / caption | 12–13px | 500 | `text-muted` |
| Stat / number | 24–32px | 700 | `primary-700` |

Line height: 1.4–1.5 for body, 1.2 for headings.

---

## Spacing & Layout

- Base spacing unit: **4px** (4, 8, 12, 16, 20, 24, 32, 40…)
- Page padding: 24px desktop, 16–20px mobile
- Card padding: 16–20px
- Gap between cards: 16px
- Max content width: 1200px, centered
- Cards: white (`surface-50`) on `surface-100`/`surface-warm` page background

## Radius

| Token | Value |
|-------|-------|
| `radius-sm` | 6px (inputs, chips) |
| `radius-md` | 10px (buttons, cards) |
| `radius-lg` | 14–16px (large cards, modals) |
| `radius-full` | 999px (avatars, pills) |

## Shadows

- Default card: `0 1px 2px rgba(16, 24, 16, 0.05), 0 1px 3px rgba(16, 24, 16, 0.06)`
- Elevated / hover: `0 4px 12px rgba(16, 24, 16, 0.08)`

---

## Component Guidelines

- **Buttons** — Primary: `primary-500` bg, white text, `radius-md`, height 40–48px.
  Secondary: white bg, 1px `surface-300` border, `text-700`.
  Danger: `danger` bg, white text.
- **Inputs** — White bg, 1px `surface-300` border, `radius-sm`, 40–44px height;
  focus ring 2px `primary-300`.
- **Status chips** — tinted background (`success-bg` / `warning-bg` / `danger-bg` / `info-bg`),
  colored dot + label, `radius-full`.
- **Cards** — White, `radius-lg`, subtle shadow, 16px padding.
- **Tables / stats** — Header text `text-muted` 13px uppercase; values bold `text-900`;
  row separators `surface-300` 1px.
- **Charts** — Use semantic palette (green/amber/red/info) for series; gridlines `surface-200`.
- **Navigation / active state** — Active item tinted `primary-100` with `primary-600` icon + label.

---

## Dark / Deep Green Surfaces

For auth screens, hero sections, or footers (from `f26e4436`): use `primary-950` (`#0C2408`)
as a deep green background with white text and `primary-500` accents.

---

## Implementation

### Web (`frontend/`, Next.js 15 + Tailwind CSS v4)

Register tokens in `globals.css` using the `@theme` block:

```css
@theme {
  --color-primary-50: #F4F8E3;
  --color-primary-100: #E2EDB8;
  --color-primary-300: #B9CC5A;
  --color-primary-500: #A2B440;
  --color-primary-600: #92AA22;
  --color-primary-700: #6E7F14;
  --color-primary-900: #345208;
  --color-primary-950: #0C2408;

  --color-surface-0: #FFFFFF;
  --color-surface-50: #FCFCFC;
  --color-surface-100: #F4F4F4;
  --color-surface-200: #F0F0F0;
  --color-surface-300: #E8E8E8;
  --color-surface-warm: #F0F0EC;

  --color-text-700: #303030;
  --color-text-900: #161616;
  --color-text-muted: #A0A0A0;

  --color-earth-300: #C4A48C;
  --color-earth-500: #947460;
  --color-earth-700: #806450;

  --color-success: #58C050;
  --color-warning: #F8BE52;
  --color-danger: #E86858;
  --color-info: #40B0D8;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}
```

Then `bg-primary-500`, `text-text-700`, `text-success`, etc. are available as utilities.

### Mobile (`mobile/`, Expo + React Native)

Mirror the same tokens in a shared theme file (e.g. `src/theme/colors.ts`), and keep the Inter
font family already configured in the app.