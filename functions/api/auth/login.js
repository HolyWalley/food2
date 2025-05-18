import { getUser, verifyPassword, createJwtToken, setAuthCookie } from '../../utils/auth.js';

/**
 * Login handler for authenticating users
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
    // Parse request body
    const body = await request.json();
    const { username, password } = body;
    
    // Validate input
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Get user from KV
    const user = await getUser(env.USER_AUTH, username);
    
    // Check if user exists
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user.hashedPassword);
    if (!isPasswordValid) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Generate JWT token
    const token = await createJwtToken(user, request, env);
    
    // Create response
    const response = new Response(JSON.stringify({
      success: true,
      message: 'Login successful',
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
    
    // Set auth cookie
    return setAuthCookie(response, token, env);
    
  } catch (error) {
    // Handle general errors
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}