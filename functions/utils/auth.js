import { v4 as uuidv4 } from 'uuid';
import * as jose from 'jose';

/**
 * Hash a password using Web Crypto API
 * @param {string} password - The password to hash
 * @returns {Promise<string>} - The hashed password
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hash);
}

/**
 * Convert an ArrayBuffer to a hexadecimal string
 * @param {ArrayBuffer} buffer - The buffer to convert
 * @returns {string} - The hexadecimal string
 */
function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compare a password with a hashed password
 * @param {string} password - The password to compare
 * @param {string} hashedPassword - The hashed password to compare against
 * @returns {Promise<boolean>} - Whether the password matches
 */
export async function verifyPassword(password, hashedPassword) {
  const hashed = await hashPassword(password);
  return hashed === hashedPassword;
}

/**
 * Create a new user in the KV store
 * @param {KVNamespace} USER_AUTH - The KV namespace for user auth
 * @param {string} username - The username
 * @param {string} password - The password
 * @returns {Promise<Object>} - The created user object
 */
export async function createUser(USER_AUTH, username, password) {
  // Check if user already exists
  const existingUser = await USER_AUTH.get(username);
  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Generate a UUID for the user
  const uuid = uuidv4();

  // Create user object
  const user = {
    username,
    hashedPassword,
    uuid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save to KV
  await USER_AUTH.put(username, JSON.stringify(user));

  // Return user without sensitive information
  const { hashedPassword: _, ...safeUser } = user;
  return safeUser;
}

/**
 * Get a user from the KV store
 * @param {KVNamespace} USER_AUTH - The KV namespace for user auth
 * @param {string} username - The username
 * @returns {Promise<Object|null>} - The user object or null if not found
 */
export async function getUser(USER_AUTH, username) {
  const user = await USER_AUTH.get(username);
  if (!user) {
    return null;
  }
  return JSON.parse(user);
}

/**
 * Hash a value using SHA-256
 * @param {string} value - The value to hash
 * @returns {Promise<string>} - The hashed value
 */
export async function hashValue(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hash);
}

/**
 * Create a JWT token for authentication
 * @param {Object} user - The user object
 * @param {Object} request - The request object
 * @param {Object} env - The environment variables object
 * @returns {Promise<string>} - The JWT token
 */
export async function createJwtToken(user, request, env) {
  const ip = request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';

  const userAgent = request.headers.get('User-Agent') || '';
  const timezone = request.headers.get('Timezone') || 'UTC';

  // Hash the first 16 bits of the IP
  const ipParts = ip.split('.');
  const firstTwoOctets = ipParts.slice(0, 2).join('.');
  const hashedIp = await hashValue(firstTwoOctets);

  // Hash the user agent
  const hashedUserAgent = await hashValue(userAgent);

  const payload = {
    sub: user.uuid,
    username: user.username,
    ip: hashedIp,
    ua: hashedUserAgent,
    tz: timezone
  };

  // Create JWT using jose
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return jwt;
}

/**
 * Set the JWT token as a cookie
 * @param {Response} response - The response object
 * @param {string} token - The JWT token
 * @param {Object} env - The environment variables object
 * @returns {Response} - The response with cookie set
 */
export function setAuthCookie(response, token, env) {
  let cookieValue = `${env.COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`;

  if (env.ENVIRONMENT !== 'development') {
    cookieValue += '; Secure';
  }

  response.headers.set('Set-Cookie', cookieValue);
  return response;
}

/**
 * Clear the authentication cookie
 * @param {Response} response - The response object
 * @param {Object} env - The environment variables object
 * @returns {Response} - The response with cookie cleared
 */
export function clearAuthCookie(response, env) {
  let cookieValue = `${env.COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`;

  if (env.ENVIRONMENT !== 'development') {
    cookieValue += '; Secure';
  }

  response.headers.set('Set-Cookie', cookieValue);
  return response;
}

/**
 * Verify JWT token and authentication factors
 * @param {string} token - The JWT token
 * @param {Object} request - The request object
 * @param {Object} env - The environment variables object
 * @returns {Promise<Object>} - The decoded token payload if valid
 * @throws {Error} - If token is invalid or authentication factors don't match
 */
export async function verifyJwtToken(token, request, env) {
  try {
    // Verify token signature
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    // Verify authentication factors
    const ip = request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For') ||
      '127.0.0.1';

    const userAgent = request.headers.get('User-Agent') || '';
    const timezone = request.headers.get('Timezone') || 'UTC';

    // Hash factors for comparison
    const ipParts = ip.split('.');
    const firstTwoOctets = ipParts.slice(0, 2).join('.');
    const hashedIp = await hashValue(firstTwoOctets);
    const hashedUserAgent = await hashValue(userAgent);

    // Check authentication factors
    let factorsMismatched = 0;

    if (hashedIp !== payload.ip) factorsMismatched++;
    if (hashedUserAgent !== payload.ua) factorsMismatched++;
    if (timezone !== payload.tz) factorsMismatched++;

    // If 2 or more factors don't match, invalidate the token
    if (factorsMismatched >= 2) {
      throw new Error('Authentication factors validation failed');
    }

    return payload;
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

/**
 * Extract JWT token from cookies
 * @param {Object} request - The request object
 * @param {Object} env - The environment variables object
 * @returns {string|null} - The JWT token or null if not found
 */
export function getJwtTokenFromRequest(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [name, ...value] = c.split('=');
      return [name, value.join('=')];
    })
  );

  return cookies[env.COOKIE_NAME] || null;
}
