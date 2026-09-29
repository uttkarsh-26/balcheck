# Security headers

## What is set today

Every response on this site carries (see the single definition: `public/_headers` on
Cloudflare Pages sites, `lib/security-headers.ts` + `next.config.ts` `headers()` on
Next/OpenNext sites):

| Header | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests` |
| `Strict-Transport-Security` | `max-age=15552000` (zone-level rule, except on the one site that declares it in code) |

`frame-ancestors` / `X-Frame-Options` govern who may frame **us** — they do not restrict the
ad iframes we embed, so ad delivery is untouched. `form-action 'self'` is safe because no page
on the site posts a form to a third-party origin (checked against live HTML).

## Why the content directives are not locked down

An enforced `script-src` / `connect-src` / `frame-src` allowlist would silently kill revenue:
the ad networks rotate hosts at runtime. Verified with a real browser run that injected a
candidate CSP against the live site and recorded every `securitypolicyviolation`:

- Monetag: its tag is served from `quge5.com`, but at runtime it fetched
  `https://6opo.com/88/268088?dmn=quge5.com` (blocked by `connect-src`) — the host is not
  stable, so any fixed allowlist for it is a time bomb.
- AdSense: in addition to `pagead2.googlesyndication.com`, it pulled
  `ep2.adtrafficquality.google/sodar/sodar2.js` (blocked by `script-src`) and renders in
  `googleads.g.doubleclick.net` iframes.
- Analytics: GA4 collected to `analytics.google.com`, `www.google.com/g/collect` and
  `stats.g.doubleclick.net` (all blocked by `connect-src`); Cloudflare Web Analytics loads
  `static.cloudflareinsights.com/beacon.min.js`.

## Host inventory for a future full CSP rollout

Only useful once the ad hosts stop rotating (or with `script-src ... 'unsafe-inline'` accepted
as a known limitation). Verified hosts to allow:

- `script-src`: self, `'unsafe-inline'`, `'unsafe-eval'` (Next hydration + ad loaders),
  `www.googletagmanager.com`, `pagead2.googlesyndication.com`, `adservice.google.com`,
  `www.googletagservices.com`, `tpc.googlesyndication.com`, `ep1.adtrafficquality.google`,
  `ep2.adtrafficquality.google`, `static.cloudflareinsights.com`, `plausible.io`, `quge5.com`
  (plus the rotating Monetag hosts).
- `connect-src`: self, `www.google-analytics.com`, `region1.google-analytics.com`,
  `analytics.google.com`, `stats.g.doubleclick.net`, `csi.gstatic.com`,
  `pagead2.googlesyndication.com`, `googleads.g.doubleclick.net`,
  `ep1.adtrafficquality.google`, `quge5.com` (plus rotating Monetag hosts).
- `img-src`: self, `data:`, `blob:`, `https:` (ad creatives and analytics beacons are arbitrary https).
- `style-src`: self, `'unsafe-inline'`, `fonts.googleapis.com`.
- `font-src`: self, `data:`, `fonts.gstatic.com`.
- `frame-src`: self, `googleads.g.doubleclick.net`, `tpc.googlesyndication.com`, `www.google.com`.

## Test recipe

Re-run the dry run before promoting any enforcing CSP — it injects the candidate policy on
document responses in a real headless Chromium, waits for ads/analytics, and lists every
blocked host:

```bash
NODE_PATH=<site>/node_modules node csp-dryrun.js   # scratch harness; prints blocked[] per path
```
