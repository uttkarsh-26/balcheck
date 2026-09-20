import { resolveLegacyRedirect } from "./lib/legacy-redirects.mjs";

const CANONICAL_HOST = "balcheck.in";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // One canonical host. Google holds www.balcheck.in URLs and www currently
    // has no Worker route (Cloudflare answers 530), so fold it onto the apex
    // before anything else touches the request.
    if (url.hostname === `www.${CANONICAL_HOST}`) {
      return Response.redirect(
        `https://${CANONICAL_HOST}${url.pathname}${url.search}`,
        301
      );
    }

    // Legacy / Google-invented paths that would otherwise 404 (map + contract
    // test in src/lib/legacy-redirects.mjs and scripts/test-legacy-redirects.mjs).
    const legacyTarget = resolveLegacyRedirect(url.pathname);
    if (legacyTarget) {
      return Response.redirect(
        `https://${CANONICAL_HOST}${legacyTarget}${url.search}`,
        301
      );
    }

    // Never cache API or dynamic routes
    if (url.pathname.startsWith("/api/")) {
      const resp = await env.ASSETS.fetch(request);
      const r = new Response(resp.body, resp);
      r.headers.set("Cache-Control", "no-store, max-age=0");
      return r;
    }

    const resp = await env.ASSETS.fetch(request);
    const r = new Response(resp.body, resp);
    const contentType = resp.headers.get("Content-Type") || "";

    // Only set cache-control for HTML responses.
    // Static assets (CSS/JS/images) are handled by _headers file.
    if (contentType.includes("text/html")) {
      r.headers.set(
        "Cache-Control",
        "public, s-maxage=3600, max-age=0, stale-while-revalidate=86400"
      );
    }
    return r;
  },
};
