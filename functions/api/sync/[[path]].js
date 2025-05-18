/**
 * CouchDB Sync Proxy
 * 
 * This function proxies requests from client-side PouchDB to server-side CouchDB.
 * The existing _middleware.js will handle authentication and CORS.
 */

export async function onRequest(context) {
  const { request, env, data } = context;

  // Get the CouchDB URL from environment variables
  const COUCHDB_URL = env.COUCHDB_URL;
  
  if (!COUCHDB_URL) {
    return new Response('CouchDB URL not configured', { status: 500 });
  }

  // Extract the path being requested (after /api/sync/)
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/sync/, '');
  
  // Build the target CouchDB URL
  const targetUrl = new URL(COUCHDB_URL);
  
  // Preserve the path
  targetUrl.pathname += path;
  
  // Preserve query parameters
  targetUrl.search = url.search;
  
  try {
    // Create a new request to forward to CouchDB
    const couchRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: filterHeaders(request.headers),
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined,
    });

    // Forward the request to CouchDB
    const couchResponse = await fetch(couchRequest);
    
    // Create a new response with the same status and body
    const response = new Response(couchResponse.body, {
      status: couchResponse.status,
      statusText: couchResponse.statusText,
      headers: couchResponse.headers,
    });
    
    return response;
  } catch (error) {
    console.error('CouchDB proxy error:', error);
    return new Response(`CouchDB proxy error: ${error.message}`, { status: 502 });
  }
}

/**
 * Filter headers to remove those that shouldn't be forwarded
 */
function filterHeaders(headers) {
  const filtered = new Headers();
  
  // Copy headers that are safe to forward
  for (const [key, value] of headers.entries()) {
    // Skip headers that shouldn't be forwarded
    if (
      key.toLowerCase() === 'host' ||
      key.toLowerCase() === 'origin' ||
      key.toLowerCase() === 'referer' ||
      key.toLowerCase().startsWith('cf-') ||
      key.toLowerCase().startsWith('x-forwarded-') ||
      key.toLowerCase().startsWith('sec-')
    ) {
      continue;
    }
    
    filtered.set(key, value);
  }
  
  // Set content-type if not already set and request has a body
  if (!filtered.has('content-type')) {
    filtered.set('content-type', 'application/json');
  }
  
  return filtered;
}