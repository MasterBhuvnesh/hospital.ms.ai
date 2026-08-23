# Sidebar

The left navigation of this dashboard ([components/dashboard/sidebar.tsx](../components/dashboard/sidebar.tsx)).
Fixed-width column with three zones: a team switcher card on top, a scrollable
sectioned nav in the middle, and a profile card pinned to the bottom with a fade scrim.

```
┌──────────────────────┐
│ ┌──────────────────┐ │ ← team switcher card (white, rounded-lg, border, shadow-xs)
│ │ Agency           │ │
│ │ Spark Pixel Team │ │
│ └──────────────────┘ │
│  Main Menu           │ ← section label (text-xs)
│ ┌──────────────────┐ │
│ │ ⌂ Dashboard      │ │ ← ACTIVE item: white card look (border + bg-card + shadow-xs)
│ └──────────────────┘ │
│   ▤ Products         │ ← inactive item: muted text, hover:bg-accent
│   ▤ Transactions     │
│  ──────────────────  │ ← sections separated by border-t
│  Customers           │
│   ...      (scrolls) │
│ ░░░░░░░░░░░░░░░░░░░░ │ ← scrim: nav fades out above the profile card
│ ┌──────────────────┐ │
│ │ ◉ Salung Prastyo │ │ ← profile card (avatar + name + role, no status dot, no icon)
│ │   Sales Operator │ │
│ └──────────────────┘ │
└──────────────────────┘
```

## Layer recipe

| Piece | Classes |
|---|---|
| Container | `hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar` (hidden below `lg`) |
| Top/bottom cards | `flex w-full items-center gap-2.5 rounded-lg border bg-card p-2.5 shadow-xs` |
| Nav scroll area | `flex-1 overflow-y-auto px-4 pb-4` |
| Section divider | wrapper gets `mt-4 border-t pt-4` (every section except the first) |
| Section label | `px-2 pb-2 text-xs text-foreground` |
| Active item | `flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2 text-sm font-medium shadow-xs` |
| Inactive item | `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground` |
| Scrim | `pointer-events-none absolute inset-x-0 -top-10 h-10 bg-linear-to-t from-sidebar to-transparent` inside a `relative` footer wrapper |

## Rules

- Active state = the "white card" treatment (border + `bg-card` + `shadow-xs`), same
  language as the tray-card pattern (see [tray-card.md](tray-card.md)); never a colored fill.
- Icons: Hugeicons outline, `size={18} strokeWidth={1.8}`, one per item, always with a label.
- Two-line cards (team/profile): bold-ish primary line (`text-sm font-medium/semibold`),
  `text-[11px] text-muted-foreground` secondary line.
- The bottom profile card is intentionally minimal: avatar + text only — no status dot,
  no chevron icon.
- The scrim keeps scrolling nav text from hard-clipping against the profile card; it must
  stay `pointer-events-none`.

## Example

Nav items come from a plain data array, one component renders everything:

```tsx
type NavItem = { label: string; icon: IconSvgElement; active?: boolean };

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Main Menu",
    items: [
      { label: "Dashboard", icon: Home01Icon, active: true },
      { label: "Products", icon: PackageIcon },
    ],
  },
];

<aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar">
  {/* team switcher */}
  <div className="p-4">
    <button className="flex w-full items-center gap-2.5 rounded-lg border bg-card p-2.5 shadow-xs">
      <span className="flex-1 text-left">
        <span className="block text-[11px] text-muted-foreground">Agency</span>
        <span className="block text-sm font-medium">Spark Pixel Team</span>
      </span>
    </button>
  </div>

  {/* sectioned nav */}
  <nav className="flex-1 overflow-y-auto px-4 pb-4">
    {sections.map((section, i) => (
      <div key={section.title} className={i > 0 ? "mt-4 border-t pt-4" : ""}>
        <p className="px-2 pb-2 text-xs text-foreground">{section.title}</p>
        <ul className="space-y-0.5">
          {section.items.map((item) => (
            <li key={item.label}>
              <a
                href="#"
                className={
                  item.active
                    ? "flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2 text-sm font-medium shadow-xs"
                    : "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                }
              >
                <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.8} />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>

  {/* profile card with scrim */}
  <div className="relative p-4 pt-0">
    <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-linear-to-t from-sidebar to-transparent" />
    <button className="flex w-full items-center gap-2.5 rounded-lg border bg-card p-2.5 shadow-xs">
      <Image src="/avatar.png" alt="User" width={36} height={36} className="size-9 rounded-full object-cover" />
      <span className="flex-1 text-left">
        <span className="block text-sm font-semibold">Salung Prastyo</span>
        <span className="block text-[11px] text-muted-foreground">Sales Operator</span>
      </span>
    </button>
  </div>
</aside>
```
