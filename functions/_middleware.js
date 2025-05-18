import { getJwtTokenFromRequest, verifyJwtToken, clearAuthCookie } from './utils/auth.js';

/**
 * Middleware for Cloudflare Pages Functions
 * Handles CORS headers and authentication
 */
export async function onRequest(context) {
  const { request, env, next } = context;

  // Define public paths that don't require authentication
  const PUBLIC_PATHS = [
    '/api/health',
    '/api/auth/signup',
    '/api/auth/login',
    '/api/auth/logout'
  ];

  // Define CORS headers to add to all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Timezone',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // Authentication check for non-public paths
  if (!PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath))) {
    try {
      // Get token from request
      const token = getJwtTokenFromRequest(request, env);

      if (!token) {
        const response = new Response(
          JSON.stringify({ error: 'Authentication required' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
        return response;
      }

      // Verify token and authentication factors
      const decodedToken = await verifyJwtToken(token, request, env);

      // Add user info to context for downstream handlers
      context.data.user = {
        uuid: decodedToken.sub,
        username: decodedToken.username
      };
    } catch (error) {
      // Clear invalid auth cookie
      const response = new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );

      return clearAuthCookie(response, env);
    }
  }

  // Process the request through the next handler
  const response = await next();

  // Add CORS headers to the response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Return the modified response
  return response;
}
