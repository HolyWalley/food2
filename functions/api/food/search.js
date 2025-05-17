/**
 * Food search API endpoint
 * Proxies requests to Nutritionix API with caching
 */
export async function onRequest({ request, env }) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Query must be at least 2 characters' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Check for API credentials
    if (!env.NUTRITIONIX_APP_ID || !env.NUTRITIONIX_API_KEY) {
      return new Response(JSON.stringify({ error: 'API credentials not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Create cache key
    const cacheKey = `food-search:${query.toLowerCase()}`;
    
    // Check cache first
    let responseData;
    if (env.FOOD_CACHE) {
      const cachedData = await env.FOOD_CACHE.get(cacheKey);
      if (cachedData) {
        responseData = cachedData;
      }
    }
    
    // If not in cache, call Nutritionix API
    if (!responseData) {
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
      
      responseData = await apiResponse.text();
      
      // Store in KV cache if available
      if (env.FOOD_CACHE) {
        await env.FOOD_CACHE.put(cacheKey, responseData, { expirationTtl: 86400 });
      }
    }
    
    return new Response(responseData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in food search:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to search for food items',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}