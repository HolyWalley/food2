export async function onRequest(context) {
  const { env } = context;
  
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
      'Access-Control-Allow-Origin': '*'
    }
  });
}