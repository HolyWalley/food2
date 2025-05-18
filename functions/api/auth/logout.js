import { clearAuthCookie } from '../../utils/auth.js';

/**
 * Logout handler for signing out users
 * @param {Object} context - The context object
 * @returns {Response} - The response
 */
export async function onRequest(context) {
  const { request, env } = context;
  
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST'
      }
    });
  }

  try {
    // Create response
    const response = new Response(JSON.stringify({
      success: true,
      message: 'Logout successful'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Clear auth cookie
    return clearAuthCookie(response, env);
    
  } catch (error) {
    // Handle general errors
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Logout failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}