// BalCheck edge worker (Cloudflare Workers static assets, run_worker_first).
//
// Sitemap cache/release protection:
//  - XML responses get a content-derived ETag (SHA-256 of the current body)
//    and `Cache-Control: public, max-age=0, must-revalidate`.
//  - Incoming conditional headers (If-None-Match / If-Modified-Since) are
//    stripped before env.ASSETS.fetch for XML, so a stale upstream ETag
//    (Workers static-assets ETags were observed NOT changing across the old
//    448-URL and new 811-URL sitemap bodies) can never make upstream return a
//    stale 304 and pin old content. 304 is returned only when the client ETag
//    matches the CURRENT content hash.
//  - HTML / API / non-XML static asset behavior is unchanged.

const XML_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const HTML_CACHE_CONTROL = 'public, s-maxage=3600, max-age=0, stale-while-revalidate=86400';
const API_CACHE_CONTROL = 'no-store, max-age=0';

interface AssetsBinding {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
}

/**
 * Returns true when the client's If-None-Match value matches the current
 * validator. Handles weak validators (W/"...") and comma-separated lists.
 */
export function etagMatches(clientValue: string | null | undefined, currentETag: string): boolean {
  if (!clientValue) return false;
  const wanted = currentETag.replace(/^W\//, '');
  return clientValue.split(',').some((part) => part.trim().replace(/^W\//, '') === wanted);
}

/** Content-derived validator: SHA-256 of the response body, quoted per RFC 9110. */
export async function computeETag(body: ArrayBuffer | string): Promise<string> {
  const data = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `"${hex}"`;
}

/**
 * Copy of the request with conditional validators removed, so upstream static
 * assets always return the CURRENT body instead of a (possibly stale) 304.
 */
export function stripConditionalHeaders(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.delete('If-None-Match');
  headers.delete('If-Modified-Since');
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: request.redirect,
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }
  return new Request(request.url, init);
}

/** Testable request handler. The default export wires it to the Workers runtime. */
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Never cache API or dynamic routes
  if (url.pathname.startsWith('/api/')) {
    const resp = await env.ASSETS.fetch(request);
    const r = new Response(resp.body, resp);
    r.headers.set('Cache-Control', API_CACHE_CONTROL);
    return r;
  }

  // For XML (sitemaps), do not trust upstream validators: strip client
  // conditionals, hash the CURRENT body, and revalidate against that hash.
  const isXmlRequest =
    url.pathname.endsWith('.xml') || request.headers.get('Accept')?.includes('xml');
  const upstreamRequest = isXmlRequest ? stripConditionalHeaders(request) : request;

  const resp = await env.ASSETS.fetch(upstreamRequest);
  const contentType = resp.headers.get('Content-Type') || '';

  if (contentType.includes('xml') && resp.ok && request.method === 'GET') {
    const body = await resp.text();
    const etag = await computeETag(body);
    if (etagMatches(request.headers.get('If-None-Match'), etag)) {
      return new Response(null, {
        status: 304,
        headers: { ETag: etag, 'Cache-Control': XML_CACHE_CONTROL },
      });
    }
    const xmlResp = new Response(body, resp);
    xmlResp.headers.set('ETag', etag);
    xmlResp.headers.set('Cache-Control', XML_CACHE_CONTROL);
    return xmlResp;
  }

  const r = new Response(resp.body, resp);

  // Only set cache-control for HTML responses.
  // Static assets (CSS/JS/images) are handled by the _headers file.
  if (contentType.includes('text/html')) {
    r.headers.set('Cache-Control', HTML_CACHE_CONTROL);
  }
  return r;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
