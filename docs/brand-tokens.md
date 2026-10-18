# BalCheck Brand Tokens

Single source of truth for visual style. `src/styles/global.css` `@theme` implements these as Tailwind tokens (`brand-*`, `saffron-*`, `font-hindi`).

## Color

| Token | Hex | Use |
|---|---|---|
| brand-600 | `#2563eb` | Primary: CTAs, links, active states |
| brand-700 | `#1d4ed8` | Primary hover / number text on brand-50 |
| brand-800/900 | `#1e40af` / `#1e3a8a` | Gradient ends, hero CTA gradient |
| brand-50 | `#eff6ff` | Tint backgrounds (number cards, chips) |
| saffron-500/600 | `#f97316` / `#ea580c` | Reserved: India-accent moments only; never competing with the primary CTA |
| amber-50/200/600 | Tailwind defaults | Warning/merger banners only |
| gray scale | Tailwind defaults | Text, borders, surfaces |

Rules:
- Never introduce ad-hoc hexes in components — use the tokens.
- One primary CTA per view; secondary actions are tinted/ghost styles.
- Warning colors (amber/yellow) are reserved for data-integrity notices (merger banners, `needs_verification`).

## Typography

- `font-hindi`: Latin-first stack — `var(--font-sans)`, then "Noto Sans Devanagari", "Mangal". Latin letters and digit runs (phone numbers, English labels) render in system-ui's Latin glyphs; Devanagari falls through to Noto Sans Devanagari.
- `font-sans`: system-ui stack — UI labels in English (per AGENTS.md: content Hindi, labels English).
- No external font loading (deliberate: PageSpeed). Do not add webfonts without a perf review.
- Scale (one step each, Tailwind `@theme` tokens in `global.css`):
  - H1 `text-h1` — fluid 24px → 36px desktop. One H1 size per template; no ad-hoc `text-*` overrides on h1.
  - H2 `text-h2` — fixed 20px. Always outranks the card H3 (16px).
  - Display `text-display` — the VideoHeroBanner poster headline only (an h2 in markup, visually a hero title). The single sanctioned H2 exception; never use it for section headings.
  - Card H3 `text-base` (16px); body `text-sm`; meta `text-xs`.

## Components

- **Buttons**: primary = `bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg min-h-[44px]`; hero CTA = pill `rounded-full bg-gradient-to-br from-brand-600 to-brand-700 min-h-12`. Touch targets ≥ 44px (mobile-first, AGENTS.md rule 2).
- **Cards**: `bg-white rounded-xl border border-gray-200`, hover `hover:border-brand-300 hover:shadow-sm`.
- **Chips**: one implementation — `Chip.astro` with a `size` prop (`md` = 44px rounded-full 14px/500 for filter tabs and header rail; `lg` = 52px rounded-lg 14px/500 for MoreServices cards). Colour/padding stays in the caller's class.
- **Phone numbers**: one implementation — `PhoneNumber.astro` with a `variant` prop (`boxed` 20px/700 on home cards, `display` 36px/700 primary block, `pill` 16px/500 white hero CTA, `inline` 18px/600 brand-700 on white). All variants use tabular numerals.
- **Scroll rails**: always combine `scrollbar-hide` (global utility in global.css) + `scroll-fade` (right-edge fade) so clipped chips read as scrollable, not broken.
- **Number display**: brand number = `text-brand-700 font-bold tracking-wide`, size scales with page primacy (`text-xl` card → `text-3xl sm:text-4xl` detail hero).

## Brand assets

- `public/favicon.svg` — blue rounded square + ₹ (60×60 approximates the header mark).
- `public/og-image.svg` — 1200×630 **design source only**; the served share image is the raster `public/og-image.jpg` (rendered from the SVG via `scripts/render-og-image.mjs`). `Layout.astro` defaults `ogImage` to `/og-image.jpg` — social crawlers (WhatsApp/FB/X) do not render SVG. Pass a per-page override via `<Layout ogImage="...">` only with a raster file.
- Header logo mark = ₹ in `bg-gradient-to-br from-brand-600 to-brand-700` rounded-lg square — do not duplicate this pattern in page content; the SiteHeader/SiteFooter components own it.

## Layout contract

- `SiteHeader` is sticky (`sticky top-0 z-40`); page content must not use `z-40+` outside modals.
- Sitewide footer links live ONLY in `SiteFooter.astro`. Never add an inline `<footer>` in a page (homepage dedupe, Sep 2026).
- Max widths: exactly two container tokens — `max-w-copy` (48rem) for prose/hero/CTA/legal/FAQ/detail content, `max-w-wide` (72rem) for directory grids, header and footer. No ad-hoc `max-w-3xl/4xl/5xl/6xl` measures.
- **AdSense Auto ads**: the loader may inject `.google-auto-placed` anywhere, including inside the vertical pages' link-card grids. Those grids carry the `ads-resilient` class (global.css): `align-items: start` stops an ad-inflated card stretching its siblings, and an ad landing as a direct grid child gets its own full-width row (`grid-column: 1 / -1`). Ads are never hidden or resized (policy-safe).
