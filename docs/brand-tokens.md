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

- `font-hindi`: "Noto Sans Devanagari", "Mangal", system-ui — all Hindi content.
- `font-sans`: system-ui stack — UI labels in English (per AGENTS.md: content Hindi, labels English).
- No external font loading (deliberate: PageSpeed). Do not add webfonts without a perf review.
- Scale: hero H1 `text-2xl sm:text-4xl` (home) / `text-2xl sm:text-3xl` (bank pages); section H2 `text-xl`; card H3 `text-base`; body `text-sm`; meta `text-xs`.

## Components

- **Buttons**: primary = `bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg min-h-[44px]`; hero CTA = pill `rounded-full bg-gradient-to-br from-brand-600 to-brand-700 min-h-12`. Touch targets ≥ 44px (mobile-first, AGENTS.md rule 2).
- **Cards**: `bg-white rounded-xl border border-gray-200`, hover `hover:border-brand-300 hover:shadow-sm`.
- **Chips**: `rounded-full bg-brand-50 text-brand-700 text-xs font-medium` inside `scrollbar-hide scroll-fade` rails.
- **Scroll rails**: always combine `scrollbar-hide` (global utility in global.css) + `scroll-fade` (right-edge fade) so clipped chips read as scrollable, not broken.
- **Number display**: brand number = `text-brand-700 font-bold tracking-wide`, size scales with page primacy (`text-xl` card → `text-3xl sm:text-4xl` detail hero).

## Brand assets

- `public/favicon.svg` — blue rounded square + ₹ (60×60 approximates the header mark).
- `public/og-image.svg` — 1200×1200 share image, referenced by `Layout.astro` (`ogImage` prop, default `/og-image.svg`). Pass a per-page override via `<Layout ogImage="...">` where a page-specific image exists.
- Header logo mark = ₹ in `bg-gradient-to-br from-brand-600 to-brand-700` rounded-lg square — do not duplicate this pattern in page content; the SiteHeader/SiteFooter components own it.

## Layout contract

- `SiteHeader` is sticky (`sticky top-0 z-40`); page content must not use `z-40+` outside modals.
- Sitewide footer links live ONLY in `SiteFooter.astro`. Never add an inline `<footer>` in a page (homepage dedupe, Sep 2026).
- Max widths: `max-w-6xl` (header/footer/directory), `max-w-4xl` (detail content), `max-w-3xl` (FAQ/prose).
