export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Never cache API or dynamic routes
    if (url.pathname.startsWith("/api/")) {
      const resp = env.ASSETS.fetch(request);
      const r = new Response(resp.body, resp);
      r.headers.set("Cache-Control", "no-store, max-age=0");
      return r;
    }

    const resp = env.ASSETS.fetch(request);
    const r = new Response(resp.body, resp);
    // Aggressive edge cache for static HTML — 24h edge, 1h browser, 7d stale revalidate
    r.headers.set(
      "Cache-Control",
      "public, s-maxage=2592000, max-age=3600, stale-while-revalidate=604800"
    );
    return r;
  },
};
