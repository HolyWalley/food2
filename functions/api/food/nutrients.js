/**
 * Food nutrients API endpoint
 * Gets nutritional information for food items
 */
export async function onRequest({ request, env }) {
  try {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
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
    
    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!requestData.query || typeof requestData.query !== 'string' || requestData.query.trim() === '') {
      return new Response(JSON.stringify({ error: 'Valid query is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Create cache key
    const cacheKey = `food-nutrients:${requestData.query.toLowerCase()}`;
    
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
      
      responseData = await apiResponse.text();
      
      // Store in KV cache if available
      if (env.FOOD_CACHE) {
        await env.FOOD_CACHE.put(cacheKey, responseData, { expirationTtl: 2592000 }); // 30 days
      }
    }
    
    return new Response(responseData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in food nutrients:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch nutritional information',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}