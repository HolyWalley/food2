/**
 * Main Cloudflare Worker entry point that routes requests to the appropriate function
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    
    // Health check endpoint
    if (path === '/api/health') {
      const response = {
        status: 'ok',
        time: new Date().toISOString(),
        environment: env.ENVIRONMENT || 'unknown',
        cacheAvailable: !!env.FOOD_CACHE,
        nutritionixApiAvailable: !!(env.NUTRITIONIX_APP_ID && env.NUTRITIONIX_API_KEY)
      };
      
      return new Response(JSON.stringify(response, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Food search endpoint
    if (path === '/api/food/search') {
      return handleFoodSearch(request, env, corsHeaders);
    }
    
    // Food nutrients endpoint
    if (path === '/api/food/nutrients') {
      return handleFoodNutrients(request, env, corsHeaders);
    }
    
    // Default response for unknown endpoints
    return new Response(`Not found: ${path}`, {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        ...corsHeaders
      }
    });
  }
};

/**
 * Handle food search requests
 */
async function handleFoodSearch(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Query must be at least 2 characters' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Check for API credentials
    if (!env.NUTRITIONIX_APP_ID || !env.NUTRITIONIX_API_KEY) {
      return new Response(JSON.stringify({ error: 'API credentials not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
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
        'Content-Type': 'application/json',
        ...corsHeaders
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
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Handle food nutrients requests
 */
async function handleFoodNutrients(request, env, corsHeaders) {
  try {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Check for API credentials
    if (!env.NUTRITIONIX_APP_ID || !env.NUTRITIONIX_API_KEY) {
      return new Response(JSON.stringify({ error: 'API credentials not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
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
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    if (!requestData.query || typeof requestData.query !== 'string' || requestData.query.trim() === '') {
      return new Response(JSON.stringify({ error: 'Valid query is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
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
        'Content-Type': 'application/json',
        ...corsHeaders
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
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}