# Design System

The visual language of this dashboard: tokens, color, typography, and the component
patterns everything is built from.

**Existing pattern docs** — these already cover three pieces in depth, read them alongside this file:

| Doc | Covers |
|---|---|
| [style-docs/tray-card.md](tray-card.md) | The signature two-layer card (tray + inner card). Used by every panel and KPI. |
| [style-docs/sidebar.md](sidebar.md) | Left nav: team switcher, sectioned nav, profile card, scrim. |
| [style-docs/scrollbar.md](scrollbar.md) | The 4px hairline scrollbar defined globally. |

This file is the layer above them: the tokens they consume and the patterns they don't cover
(shell, tables, forms, charts, buttons, status badges).

---

## 1. Design principles

The whole UI runs on five rules. If a new component follows these, it will look native.

1. **Achromatic.** There is no brand hue. Every neutral token is `oklch(L 0 0)` — chroma
   exactly zero. Color appears *only* as semantic status (emerald / amber / red).
2. **Depth comes from stacked surfaces, not shadows.** A gray tray holds a white card.
   Shadows are `shadow-xs`/`shadow-sm` at most, and always on the outer layer.
3. **Mono for data, sans for prose.** Every number, ID, label and axis tick is `font-mono`.
   Sentences are `font-sans`. This is the strongest signature of the design.
4. **Active state = the white card treatment.** Selected nav item, active filter pill —
   never a colored fill, always `bg-card` + border + `shadow-xs`.
5. **Charts are monochrome.** Series are opacity steps of `--foreground`, so they invert
   correctly in dark mode for free.

---

## 2. Color

All colors are CSS custom properties in [app/globals.css](../app/globals.css), declared as
**OKLCH** and exposed to Tailwind through `@theme inline`. Never hardcode a hex in a component —
use the token (`bg-card`, `text-muted-foreground`, …).

### Why OKLCH

`oklch(L C H)` = **L**ightness (0–1) · **C**hroma (saturation) · **H**ue (0–360°).
Because every neutral here is `C = 0`, the whole gray ramp is a single number — `L` — which
makes contrast tuning trivial and guarantees no color cast. The values line up exactly with
Tailwind's `neutral` scale.

### Light theme — `:root`

| Token | OKLCH | Hex | Tailwind ≈ | Used for |
|---|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `#FFFFFF` | white | page canvas |
| `--foreground` | `oklch(0.145 0 0)` | `#0A0A0A` | neutral-950 | body text, chart ink |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | white | inner cards, active nav |
| `--card-foreground` | `oklch(0.145 0 0)` | `#0A0A0A` | neutral-950 | text on cards |
| `--popover` | `oklch(1 0 0)` | `#FFFFFF` | white | dropdowns, tooltips |
| `--primary` | `oklch(0.205 0 0)` | `#171717` | neutral-900 | primary button fill |
| `--primary-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | neutral-50 | text on primary |
| `--secondary` / `--muted` / `--accent` | `oklch(0.97 0 0)` | `#F5F5F5` | neutral-100 | trays, input wells, hover |
| `--muted-foreground` | `oklch(0.556 0 0)` | `#737373` | neutral-500 | labels, secondary text |
| `--border` / `--input` | `oklch(0.922 0 0)` | `#E5E5E5` | neutral-200 | hairlines, field borders |
| `--ring` | `oklch(0.708 0 0)` | `#A1A1A1` | neutral-400 | focus ring |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#E7000B` | red-600 | destructive actions |
| `--sidebar` | `oklch(0.985 0 0)` | `#FAFAFA` | neutral-50 | sidebar surface |
| `--sidebar-border` | `oklch(75.246% 0.00226 15.124)` | `#B0AEAE` | — | sidebar edge |
| `--comp-border` | `rgba(229, 229, 229)` | `#E5E5E5` | neutral-200 | the 2px "chunky" borders |
| `--radius` | `0.625rem` | — | — | radius base (10px) |

### Dark theme — `.dark`

Only the values change; every token name stays identical. Note it is **not** a pure inversion —
`--card` sits *lighter* than `--background` so cards still read as raised surfaces.

| Token | OKLCH | Hex | Tailwind ≈ |
|---|---|---|---|
| `--background` | `oklch(0.145 0 0)` | `#0A0A0A` | neutral-950 |
| `--foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | neutral-50 |
| `--card` / `--popover` / `--sidebar` | `oklch(0.205 0 0)` | `#171717` | neutral-900 |
| `--primary` | `oklch(0.922 0 0)` | `#E5E5E5` | neutral-200 |
| `--secondary` / `--muted` / `--accent` | `oklch(0.269 0 0)` | `#262626` | neutral-800 |
| `--muted-foreground` | `oklch(0.708 0 0)` | `#A1A1A1` | neutral-400 |
| `--border` | `oklch(1 0 0 / 10%)` | white @ 10% | — |
| `--input` | `oklch(1 0 0 / 15%)` | white @ 15% | — |
| `--ring` | `oklch(0.556 0 0)` | `#737373` | neutral-500 |
| `--destructive` | `oklch(0.704 0.191 22.216)` | `#FF6467` | red-400 |
| `--comp-border` | `oklch(1 0 0 / 10%)` | white @ 10% | — |

Borders in dark mode switch from a solid gray to **translucent white** — they pick up whatever
surface sits behind them, so the same class works on tray, card, and popover.

### Chart ramp

Five achromatic steps, identical in both themes (they sit on inverting surfaces, so they don't
need to flip):

```css
--chart-1: oklch(0.87  0 0);  /* #D4D4D4 — neutral-300 */
--chart-2: oklch(0.556 0 0);  /* #737373 — neutral-500 */
--chart-3: oklch(0.439 0 0);  /* #525252 — neutral-600 */
--chart-4: oklch(0.371 0 0);  /* #404040 — neutral-700 */
--chart-5: oklch(0.269 0 0);  /* #262626 — neutral-800 */
```

In practice most charts skip these entirely and derive from `--foreground` with `color-mix`
(see §7) so they invert automatically.

### Semantic status color

The one place hue is allowed. Defined in
[components/dashboard/cards.tsx](../components/dashboard/cards.tsx) as a lookup keyed by status string:

```tsx
const statusStyles: Record<string, { badge: string; dot: string }> = {
  Success:  { badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400", dot: "bg-emerald-500" },
  Pending:  { badge: "border-amber-200   bg-amber-50   text-amber-700   dark:border-amber-900   dark:bg-amber-950   dark:text-amber-400",   dot: "bg-amber-500" },
  Cancelled:{ badge: "border-red-200     bg-red-50     text-red-700     dark:border-red-900     dark:bg-red-950     dark:text-red-400",     dot: "bg-red-500" },
  Refunded: { badge: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};
```

| Meaning | Palette | Light: border-200 / bg-50 / text-700 | Dot (-500) | Statuses |
|---|---|---|---|---|
| Positive | emerald | `#A4F4CF` / `#ECFDF5` / `#007A55` | `#00BC7D` | Success, Active, Paid, Delivered, Shipped, Connected, In Stock, Resolved |
| Warning | amber | `#FEE685` / `#FFFBEB` / `#BB4D00` | `#FE9A00` | Pending, Paused, Processing, Low Stock, Open |
| Negative | red | `#FFC9C9` / `#FEF2F2` / `#C10007` | `#FB2C36` | Cancelled, Overdue, Out of Stock |
| Neutral | token grays | `--border` / `--muted` / `--muted-foreground` | `--muted-foreground` | Refunded, Ended, Disconnected |

(Hex shown for reference only — these are Tailwind v4 palette utilities, which are themselves
OKLCH; always write the class, never the hex.)

The recipe is always **border-200 / bg-50 / text-700** in light and **border-900 / bg-950 /
text-400** in dark, plus a solid `-500` dot. Positive deltas on KPI cards use
`text-emerald-600 dark:text-emerald-500`.

Adding a new status = one line in that map. Unknown statuses fall back to the neutral style.

### Adding or changing a color

```css
/* app/globals.css */
:root  { --warning: oklch(0.769 0.188 70.08); }   /* keep C=0 unless it's semantic */
.dark  { --warning: oklch(0.828 0.189 84.43); }   /* always define both themes */

@theme inline {
  --color-warning: var(--warning);                /* now usable as bg-warning / text-warning */
}
```

The `@theme inline` block is what turns a CSS variable into a Tailwind utility. Skip it and
`bg-warning` won't exist.

---

## 3. Typography

Two Geist faces loaded in [app/layout.tsx](../app/layout.tsx) via `next/font/google`, wired to
`--font-geist-sans` / `--font-geist-mono`, then aliased in `@theme inline` to `font-sans` /
`font-mono`. `html` defaults to `font-sans`.

| Role | Classes | Where |
|---|---|---|
| Page title | `text-2xl font-medium tracking-tight` | every page `<h1>` |
| Panel title | `font-mono text-sm font-medium tracking-wide uppercase text-foreground/50` | `PanelTitle` |
| KPI label | `font-mono text-[11px] tracking-wide text-muted-foreground uppercase` | KPI cards, form labels |
| KPI value | `font-mono text-[28px] leading-none font-medium tracking-tight` | KPI cards |
| Table header | `font-mono text-[10px] tracking-wider text-muted-foreground uppercase` | every `<Th>` |
| Table cell (data) | `font-mono` | IDs, money, counts |
| Table cell (name) | `font-medium` | the primary column of a row |
| Secondary line | `text-[11px] text-muted-foreground` | sidebar cards, meta rows |
| Body / prose | `text-sm` (inherits sans) | descriptions, empty states |

**The rule:** if it's a number, a code, an ID, or a small uppercase label → `font-mono`.
If it's a sentence → `font-sans`. Mixed inline, split the spans:

```tsx
<span className="text-xs font-medium">
  <span className="font-mono text-emerald-600 dark:text-emerald-500">+0,94</span>{" "}
  <span className="font-sans text-muted-foreground">last year</span>
</span>
```

---

## 4. Radius & spacing

Radius is one variable scaled into a ramp (`app/globals.css`), so changing `--radius` reshapes
the whole UI:

```css
--radius: 0.625rem;                        /* 10px — the base */
--radius-sm: calc(var(--radius) * 0.6);    /*  6px */
--radius-md: calc(var(--radius) * 0.8);    /*  8px */
--radius-lg: var(--radius);                /* 10px — buttons, nav items, inputs */
--radius-xl: calc(var(--radius) * 1.4);    /* 14px — cards, trays, inner panels */
--radius-2xl: calc(var(--radius) * 1.8);   /* 18px */
```

In practice: **`rounded-xl` for cards and trays, `rounded-lg` for controls, `rounded-full` for
pills, dots, avatars, and the `MoreButton`.**

Spacing: page content is `space-y-4`, grids use `gap-4`, tray padding is `p-1`, inner card
padding is `p-4`, and strips on the tray are `px-4 py-2.5` (title rows `px-3 py-2`).

---

## 5. Layout

### Shell

Every page is wrapped in [`<Shell>`](../components/dashboard/shell.tsx) — sidebar + header +
scrollable main. Only `main` scrolls; the shell itself is `h-screen overflow-hidden`.

```tsx
<Shell breadcrumb="Products" active="Products">
  {/* page content */}
</Shell>
```

- `breadcrumb` — the trailing crumb in the header (`Dashboard › Products`)
- `active` — must match the sidebar item's `label` exactly, that's how the active state is resolved

```
┌────────┬──────────────────────────────────────────┐
│        │ Dashboard › Products    [search] 🔔 ☾ ✉ ◉│ h-16, border-b-2 border-comp-border
│ side   ├──────────────────────────────────────────┤
│ bar    │                                          │
│ w-64   │  main — flex-1 space-y-4 overflow-y-auto │
│        │         p-4 md:p-6                       │
└────────┴──────────────────────────────────────────┘
```

Below `lg` the sidebar is hidden and the same component is rendered inside
[`<MobileNav>`](../components/dashboard/mobile-nav.tsx) as a left drawer with a `bg-black/50` scrim.

### Page skeleton

Every page repeats this shape — title row, KPI grid, panel(s):

```tsx
<Shell breadcrumb="Products" active="Products">
  {/* 1. title row — wraps on mobile */}
  <div className="flex flex-wrap items-center justify-between gap-4">
    <h1 className="text-2xl font-medium tracking-tight">Products</h1>
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="lg" className="bg-card">
        <HugeiconsIcon icon={FileExportIcon} size={14} data-icon="inline-start" />
        Export CSV
      </Button>
      <Button size="lg">…</Button>
    </div>
  </div>

  {/* 2. KPI grid — 1 / 2 / 3–4 columns */}
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {kpis.map((kpi) => <KpiCard key={kpi.label} kpi={kpi} />)}
  </div>

  {/* 3. panels */}
  <ProductsTable rows={rows} />
</Shell>
```

Breakpoints in use: `sm:` (2-col grids, header extras), `md:` (search field, `p-6` padding),
`lg:` (sidebar appears), `xl:` (3–4 col grids, side-by-side panels). Mobile-first — the base
style is the phone layout.

---

## 6. Component patterns

### Tray card — the core pattern

Fully documented in [style-docs/tray-card.md](tray-card.md). The one line to remember:

```tsx
<Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm dark:bg-muted">
  <div className="flex items-center justify-between px-3 py-2">   {/* on the tray */}
    <PanelTitle title="All Products" />
    <MoreButton />
  </div>
  <div className="flex-1 rounded-xl bg-card p-4">…</div>          {/* inner card */}
</Card>
```

21 call sites use this exact class string. Shadow on the tray, inner card flat, `ring-0` to kill
the base `<Card>` ring.

### Buttons

[components/ui/button.tsx](../components/ui/button.tsx), CVA variants. Sizes here are smaller than
stock shadcn — `lg` is `h-9`, `default` is `h-8`.

| Use | Call |
|---|---|
| Primary page action | `<Button size="lg">` |
| Secondary page action | `<Button variant="outline" size="lg" className="bg-card">` |
| Panel overflow menu | `<MoreButton />` → `variant="outline" size="icon-sm" rounded-full border-2 border-comp-border` |
| Header icon action | `<Button variant="ghost" size="icon-lg" className="border-2 border-comp-border">` |
| Row action | `<Button variant="ghost" size="icon-sm">` |

Icons use the `data-icon` attribute so padding tightens automatically — this is the intended
API, don't hand-tune padding:

```tsx
<Button size="lg">
  <HugeiconsIcon icon={PlusSignIcon} size={14} data-icon="inline-start" />
  Add Product
</Button>
```

All buttons get `active:translate-y-px` (a 1px press) and a 3px `focus-visible` ring.

### Icons

**Hugeicons only** (`@hugeicons/react` + `@hugeicons/core-free-icons`), outline style, always
via `<HugeiconsIcon icon={X} size={n} />`. Sizes: `18` for nav and header, `16` for row actions,
`14` inside buttons and inputs, `12` for table sort arrows. Sidebar icons add `strokeWidth={1.8}`.
`lucide-react` is a transitive dependency of shadcn primitives — don't reach for it in app code.

### Status badge

```tsx
<StatusBadge status="Delivered" />   // pill + dot, resolved from statusStyles (see §2)
```

### Tables

Every list view is the same three-part composition inside a tray: **toolbar strip → table in the
inner card → pagination strip.** State comes from
[`useDataTable`](../components/dashboard/use-table.tsx), a single hook handling search, filter, sort
and pagination in memory.

```tsx
const t = useDataTable(rows, {
  searchFields: (r) => [r.name, r.sku, r.category],   // OR'd substring match
  filterField: (r) => r.status,                       // drives FilterPills
  sorters: {                                          // key -> accessor
    name: (r) => r.name,
    price: (r) => num(r.price),                       // num() strips "$" and "," to sort money
    stock: (r) => r.stock,
  },
});

<Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm dark:bg-muted">
  {/* toolbar on the tray */}
  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
    <PanelTitle title="All Products" />
    <div className="flex items-center gap-2">
      <FilterPills options={["All", "In Stock", "Low Stock"]} value={t.filter} onChange={t.setFilter} />
      <div className="relative hidden md:block">
        <HugeiconsIcon icon={Search01Icon} size={14}
          className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={t.query} onChange={(e) => t.setQuery(e.target.value)}
          placeholder="Search products..."
          className="h-8 w-56 rounded-lg bg-muted/40 pl-8 shadow-none" />
      </div>
      <MoreButton />
    </div>
  </div>

  {/* table in the inner card */}
  <div className="overflow-hidden rounded-xl bg-card py-2">
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-12 pl-4"><Checkbox aria-label="Select all" /></TableHead>
          <Th label="Product" k="name" sort={t} />
          <Th label="Price" k="price" sort={t} />
          <TableHead className="pr-4 text-right font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {t.rows.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
              No results found
            </TableCell>
          </TableRow>
        )}
        {t.rows.map((p) => (
          <TableRow key={p.sku} className={p.status === "Out of Stock" ? "opacity-60" : ""}>
            <TableCell className="pl-4"><Checkbox aria-label={`Select ${p.name}`} /></TableCell>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell className="font-mono">{p.price}</TableCell>
            <TableCell className="pr-4 text-right">
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.name}`}>
                <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>

  {/* pagination on the tray */}
  <TablePagination page={t.page} pageSize={t.pageSize} total={t.total}
    onPageChange={t.setPage} onPageSizeChange={t.setPageSize} />
</Card>
```

Table conventions:

- First column is a `Checkbox` in a `w-12 pl-4` head; last is a right-aligned `Actions` head.
- Header rows get `hover:bg-transparent`; body rows keep the default `hover:bg-muted/50`.
- Sortable headers use `<Th>`; the active one flips to `text-foreground`.
- Inactive/void rows (Refunded, Out of Stock, Cancelled) get `opacity-60` — dimmed, not hidden.
- Empty state is always a full-width `colSpan` row reading "No results found".
- Row edges are `pl-4` / `pr-4` so content lines up with the tray's `px-4` strips.

### Filter pills

Segmented control, same "white card = active" language as the sidebar:

```tsx
<div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
  {options.map((opt) => (
    <button key={opt} onClick={() => onChange(opt)}
      className={opt === value ? "rounded-md bg-card px-3 py-1.5 shadow-xs"
                               : "px-3 py-1.5 text-muted-foreground"}>
      {opt}
    </button>
  ))}
</div>
```

### Forms & dialogs

All "Add X" flows go through one generic
[`<AddDialog>`](../components/dashboard/add-dialog.tsx) driven by a field array — text, number,
select, or searchable combobox. No per-entity dialog components.

```tsx
<AddDialog
  title="Add Product"
  submitLabel="Add Product"
  fields={[
    { name: "name", label: "Product name", placeholder: "Ergo Office Chair" },
    { name: "category", label: "Category", options: ["Furniture", "Lighting"] },
    { name: "customer", label: "Customer", options: allCustomers, searchable: true },
    { name: "price", label: "Price", type: "number", placeholder: "345" },
  ]}
  onSubmit={(v) => setRows((r) => [{ ...v, price: money(v.price) }, ...r])}
  trigger={<Button size="lg"><HugeiconsIcon icon={PlusSignIcon} size={14} data-icon="inline-start" />Add Product</Button>}
/>
```

Form conventions:

- Field labels are the mono micro-label: `font-mono text-[11px] tracking-wide text-muted-foreground uppercase`
- Inputs are **wells, not boxes**: `bg-muted/40 shadow-none` — a recessed tint instead of a border
- Field stack is `space-y-3`, label→control gap is `space-y-1.5`
- Footer is always `Cancel` (`variant="outline"`) then the primary submit
- `searchable: true` renders an inline combobox rather than a Popover — a Popover inside a
  Dialog fights over focus, so the list is absolutely positioned instead

---

## 7. Charts

Three chart flavors, all monochrome, all deriving from `--foreground` so dark mode is automatic.

**1. Sparkline** — pure CSS bars, no library. Max bar solid, the rest at 25%:

```tsx
<div className="flex h-8 items-end gap-0.75">
  {data.map((v, i) => (
    <div key={i}
      className={`w-0.75 rounded-full ${v === max ? "bg-foreground" : "bg-foreground/25"}`}
      style={{ height: `${(v / max) * 100}%` }} />
  ))}
</div>
```

**2. Pixel chart** — a 20-row grid of cells per column, three opacity tiers
(`bg-foreground` filled → `bg-foreground/30` partial → `bg-foreground/5` empty), with a custom
hover crosshair and tooltip. See [components/dashboard/charts.tsx](../components/dashboard/charts.tsx).

**3. Recharts** (bars, areas) via the shadcn `ChartContainer`. Colors are declared in a
`ChartConfig` using `color-mix` against `--foreground` — never a literal:

```tsx
const monthlyConfig = {
  revenue:  { label: "This Year", color: "color-mix(in oklab, var(--foreground) 70%, transparent)" },
  lastYear: { label: "Last Year", color: "color-mix(in oklab, var(--foreground) 30%, transparent)" },
} satisfies ChartConfig;

<CartesianGrid vertical={false} strokeDasharray="4 4"
  stroke="color-mix(in oklab, var(--foreground) 10%, transparent)" />
<XAxis dataKey="month" axisLine={false} tickLine={false}
  tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-geist-mono)" }} />
```

Chart rules: horizontal grid lines only, dashed `4 4` at 10% foreground, no axis lines, no tick
lines, `YAxis hide`, mono tick labels at `10px`, area fills are a 25% → 2% vertical gradient.

---

## 8. Dark mode

Class-based (`.dark` on `<html>`), toggled by
[`<ThemeToggle>`](../components/dashboard/theme-toggle.tsx), persisted to `localStorage.theme`.
A blocking inline script in [app/layout.tsx](../app/layout.tsx) applies the class before paint so
there is no flash:

```tsx
<script dangerouslySetInnerHTML={{ __html:
  `try{if(localStorage.theme==="dark"||(!localStorage.theme&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`
}} />
```

`html` carries `suppressHydrationWarning` because that script mutates it before React hydrates.

**Because everything is token-driven, components need almost no `dark:` variants.** The
exceptions, and the only times you should write one:

| Case | Why |
|---|---|
| `dark:bg-muted` on trays | `bg-muted/50` is too faint against a dark page — go full strength |
| `dark:text-emerald-500` on deltas | `emerald-600` doesn't carry enough contrast on dark |
| The full `dark:` set on status badges | Tailwind palette colors aren't tokens, so both themes are spelled out |

---

## 9. Interaction & accessibility

- **Focus:** every control gets `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` from the base button/input styles. Don't remove it.
- **Press:** buttons nudge `active:translate-y-px`.
- **Hover:** rows `hover:bg-muted/50`; ghost buttons `hover:bg-muted`; inactive nav `hover:bg-accent hover:text-foreground`.
- **Labels:** every icon-only button needs an `aria-label`, and row actions include the row identity (`aria-label={`Actions for ${p.name}`}`). Checkboxes too.
- **Transitions:** `transition-all` on buttons, `transition-colors` on rows. Nothing longer than the default duration.
- **Selection is globally disabled** (`user-select: none` on `*` in globals.css) for an app-like feel — text in a table can't be selected. If a view needs copyable text, re-enable it locally with `select-text`.

---

## 10. Adding a new page — checklist

1. `app/<route>/page.tsx`, wrapped in `<Shell breadcrumb="…" active="…">`.
2. Add the nav entry to `sections` in [components/dashboard/sidebar.tsx](../components/dashboard/sidebar.tsx) — `label` must match `active` **exactly**.
3. Title row: `flex flex-wrap items-center justify-between gap-4`, `h1` at `text-2xl font-medium tracking-tight`.
4. KPIs: `<KpiCard>` in a `grid gap-4 sm:grid-cols-2 xl:grid-cols-{3,4}`.
5. Panels: the tray card class string, `PanelTitle` + `MoreButton` on the tray.
6. Lists: `useDataTable` + `Th` + `FilterPills` + `TablePagination`.
7. Creating rows: `<AddDialog>` with a `fields` array — don't write a bespoke dialog.
8. Numbers `font-mono`, prose `font-sans`, tokens only — no hex, no new colors.
