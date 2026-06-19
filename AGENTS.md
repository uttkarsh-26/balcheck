# BalCheck.in — Agent Instructions

**balcheck.in** — Bank missed-call balance directory. Astro static site on Cloudflare Pages.
Stack: Astro 4, TypeScript, Tailwind CSS, Cloudflare Pages

## Critical Rules
1. **Never deploy manually** — push to main triggers GitHub Actions
2. **Mobile-first** — rural users on basic smartphones
3. **Hindi language** — all content in Hindi, UI labels in English
4. **Build must pass** before any commit
5. **Data accuracy** — bank numbers must be from official sources. Include source URL in data file comments.

## Commands
```bash
npm run dev       # Dev server (localhost:4321)
npm run build     # Production build
npm run preview   # Preview with Wrangler
```

## Project Structure
```
src/
  pages/index.astro       # Main page (single page site)
  layouts/Layout.astro    # HTML layout, meta tags, fonts
  components/SchemaOrg.astro # JSON-LD structured data
  data/banks.ts           # Bank missed-call number database
public/
  favicon.svg
  robots.txt
```

## Deployment
Push to `main` → GitHub Actions → Cloudflare Pages. Never use `wrangler deploy` directly.

## Data Sources
Bank missed-call numbers sourced from:
- Official bank websites
- RBI financial education materials
- Public domain banking directories

Last verified: 2026-06-19
