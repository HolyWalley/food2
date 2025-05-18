/**
 * Endpoint to get the current user's information
 * @param {Object} context - The context object with user info from middleware
 * @returns {Response} - The response with user info
 */
export async function onRequest(context) {
  const { request, user } = context;
  
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET'
      }
    });
  }

  // User should be available from middleware if authenticated
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Return user info
  return new Response(JSON.stringify({
    user: {
      username: user.username,
      uuid: user.uuid
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}