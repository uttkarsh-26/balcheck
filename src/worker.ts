export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
        "public, s-maxage=2592000, max-age=0, stale-while-revalidate=604800"
      );
    }
    return r;
  },
};
