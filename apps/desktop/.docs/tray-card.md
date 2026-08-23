# Tray Card

The signature card pattern of this dashboard. Every panel (KPI cards, Sales Trend,
Revenue Breakdown, Recent Transactions) is built from it.

## Concept

Two layers:

1. **Tray (outer card)** — a soft gray rounded container. No border, it casts the shadow.
2. **Inner card** — a flat white rounded panel floating inside the tray with a small
   gap around it. Holds the main content.

Secondary content (a delta value, a title row, pagination) sits directly **on the tray**,
above or below the inner card — never inside it.

```
┌─────────────────────────────┐  ← tray: bg-muted/50, rounded-xl, shadow-sm, ring-0, p-1
│ ┌─────────────────────────┐ │
│ │  TOTAL REVENUE      ▂▄█ │ │ ← inner card: bg-card, rounded-xl, p-4, flat (no shadow/border)
│ │  $20,320                │ │
│ └─────────────────────────┘ │
│              +0,94 last year│  ← strip on the tray (px-4 py-2.5)
└─────────────────────────────┘
```

## Layer recipe

| Layer | Classes |
|---|---|
| Tray | `gap-0 bg-muted/50 p-1 ring-0 shadow-sm dark:bg-muted` on `<Card>` (base Card gives `rounded-xl`; dark mode uses full-strength muted so the tray stays visible against the page) |
| Inner card | `rounded-xl bg-card p-4` (add `flex-1` when the card must fill grid-row height) |
| Tray strip | `px-4 py-2.5` (aligns its content with the inner card's `p-4` content) |

## Typography rules

- Labels/titles: `font-mono`, uppercase, `tracking-wide`, muted — e.g. `font-mono text-[11px] tracking-wide text-muted-foreground uppercase`
- Big values: `font-mono text-[28px] leading-none font-medium tracking-tight`
- Secondary words ("last year", suffixes like "Orders"): `font-sans` (Geist), muted
- Deltas: `font-mono text-emerald-600` for positive

## Example — KPI stat card (the "Total Revenue" card)

```tsx
<Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm">
  {/* inner white card: label + value + sparkline */}
  <div className="flex items-center justify-between gap-3 rounded-xl bg-card p-4">
    <div className="space-y-2">
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
        Total Revenue
      </p>
      <p className="font-mono text-[28px] leading-none font-medium tracking-tight">$20,320</p>
    </div>
    <Sparkline data={[4, 7, 3, 8, 5, 9, 4, 10, 6, 12]} />
  </div>
  {/* delta strip on the tray */}
  <div className="flex items-center justify-end px-4 py-2.5">
    <span className="text-xs font-medium">
      <span className="font-mono text-emerald-600">+0,94</span>{" "}
      <span className="font-sans text-muted-foreground">last year</span>
    </span>
  </div>
</Card>
```

## Example — panel variant (title on the tray, content in the inner card)

Used by Sales Trend / Revenue Breakdown / Recent Transactions.

```tsx
<Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm">
  {/* title row on the tray */}
  <div className="flex items-center justify-between px-3 py-2">
    <PanelTitle title="Revenue Breakdown" />
    <MoreButton />
  </div>
  {/* inner white card */}
  <div className="flex-1 rounded-xl bg-card p-4">{/* main content */}</div>
</Card>
```

## Do / Don't

- **Do** put the shadow on the tray, never on the inner card.
- **Do** keep the inner card flat — no border, no ring, no shadow.
- **Don't** give the tray a border (`ring-0` kills the Card default ring).
- **Don't** nest another tray inside an inner card.
- Sparklines: thin `w-0.75` rounded bars, `bg-foreground/25`, only the max bar solid `bg-foreground`.
