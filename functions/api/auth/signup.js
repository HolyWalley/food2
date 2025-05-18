import { createUser, createJwtToken, setAuthCookie } from '../../utils/auth.js';

/**
 * Signup handler for creating new user accounts
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
    
    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return new Response(JSON.stringify({ 
        error: 'Username must be 3-20 characters and can only contain letters, numbers, and underscores' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return new Response(JSON.stringify({ 
        error: 'Password must be at least 8 characters long' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Create user
    const user = await createUser(env.USER_AUTH, username, password);
    
    // Generate JWT token
    const token = await createJwtToken(user, request, env);
    
    // Create response
    const response = new Response(JSON.stringify({
      success: true,
      message: 'User created successfully',
      user: {
        username: user.username,
        uuid: user.uuid
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Set auth cookie
    return setAuthCookie(response, token, env);
    
  } catch (error) {
    // Handle specific errors
    if (error.message === 'User already exists') {
      return new Response(JSON.stringify({ error: 'Username already taken' }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Handle general errors
    console.error('Signup error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create user' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}