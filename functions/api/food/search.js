/**
 * Search for food items using the Nutritionix API
 * 
 * This function proxies requests to the Nutritionix Instant search API
 * and implements caching using Cloudflare KV to reduce API calls
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    });
  }
  
  // Extract search query from URL
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  
  if (!query || query.trim().length < 2) {
    return new Response(JSON.stringify({ error: 'Query must be at least 2 characters' }), {
      status: 400,
      headers
    });
  }
  
  // Check for API credentials
  if (!env.NUTRITIONIX_APP_ID || !env.NUTRITIONIX_API_KEY) {
    return new Response(JSON.stringify({ error: 'API credentials not configured' }), {
      status: 500,
      headers
    });
  }
  
  // Create cache key
  const cacheKey = `food-search:${query.toLowerCase()}`;
  
  try {
    // Check cache first
    const cachedResponse = await env.FOOD_CACHE.get(cacheKey);
    if (cachedResponse) {
      return new Response(cachedResponse, { headers });
    }
    
    // Not in cache, call Nutritionix API
    const nutritionixUrl = `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}`;
    const apiResponse = await fetch(nutritionixUrl, {
      headers: {
        'x-app-id': env.NUTRITIONIX_APP_ID,
        'x-app-key': env.NUTRITIONIX_API_KEY
      }
    });
    
    if (!apiResponse.ok) {
      throw new Error(`Nutritionix API error: ${apiResponse.status}`);
    }
    
    const data = await apiResponse.text();
    
    // Store in KV cache (expires after 24 hours)
    await env.FOOD_CACHE.put(cacheKey, data, { expirationTtl: 86400 });
    
    return new Response(data, { headers });
  } catch (error) {
    console.error('Error fetching food search results:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to search for food items',
      details: error.message
    }), {
      status: 500,
      headers
    });
  }
}