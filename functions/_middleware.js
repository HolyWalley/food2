// Global middleware to log requests and handle CORS
export async function onRequest({ request, next, env }) {
  console.log(`Handling request to ${request.url}`);

  // Add CORS headers for API requests
  const url = new URL(request.url);
  const isApiRequest = url.pathname.startsWith('/api/');

  if (isApiRequest) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // For OPTIONS requests (preflight), just return the headers
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // For other requests, continue to the actual handler but add CORS headers
    const response = await next();
    const newResponse = new Response(response.body, response);
    
    // Add CORS headers to the response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });
    
    return newResponse;
  }

  // For non-API requests, just pass through without modification
  return next();
}