/**
 * Get detailed nutritional information for a food item using the Nutritionix API
 * 
 * This function proxies requests to the Nutritionix Natural Nutrients API
 * and implements caching using Cloudflare KV to reduce API calls
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
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
  
  try {
    // Parse request body
    const requestData = await request.json();
    
    if (!requestData.query || typeof requestData.query !== 'string' || requestData.query.trim() === '') {
      return new Response(JSON.stringify({ error: 'Valid query is required' }), {
        status: 400,
        headers
      });
    }
    
    // Create cache key (based on the query)
    const cacheKey = `food-nutrients:${requestData.query.toLowerCase()}`;
    
    // Check cache first
    const cachedResponse = await env.FOOD_CACHE.get(cacheKey);
    if (cachedResponse) {
      return new Response(cachedResponse, { headers });
    }
    
    // Not in cache, call Nutritionix API
    const nutritionixUrl = 'https://trackapi.nutritionix.com/v2/natural/nutrients';
    const apiResponse = await fetch(nutritionixUrl, {
      method: 'POST',
      headers: {
        'x-app-id': env.NUTRITIONIX_APP_ID,
        'x-app-key': env.NUTRITIONIX_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: requestData.query
      })
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`Nutritionix API error: ${apiResponse.status} - ${errorText}`);
    }
    
    const data = await apiResponse.text();
    
    // Store in KV cache (expires after 30 days since nutritional data rarely changes)
    await env.FOOD_CACHE.put(cacheKey, data, { expirationTtl: 2592000 }); // 30 days
    
    return new Response(data, { headers });
  } catch (error) {
    console.error('Error fetching food nutrients:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch nutritional information',
      details: error.message
    }), {
      status: 500,
      headers
    });
  }
}