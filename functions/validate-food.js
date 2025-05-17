/**
 * Common validation functions for food items and queries
 */

/**
 * Validates a food query string
 * @param {string} query - The query string to validate
 * @returns {object} - Result object with isValid boolean and error message if invalid
 */
export function validateFoodQuery(query) {
  if (!query || typeof query !== 'string') {
    return {
      isValid: false,
      error: 'Query must be a valid string'
    };
  }
  
  if (query.trim().length < 2) {
    return {
      isValid: false,
      error: 'Query must be at least 2 characters'
    };
  }
  
  return {
    isValid: true
  };
}

/**
 * Validates API credentials are present
 * @param {object} env - The environment object with API keys
 * @returns {object} - Result object with isValid boolean and error message if invalid
 */
export function validateApiCredentials(env) {
  if (!env.NUTRITIONIX_APP_ID || !env.NUTRITIONIX_API_KEY) {
    return {
      isValid: false,
      error: 'Nutritionix API credentials not configured'
    };
  }
  
  return {
    isValid: true
  };
}

/**
 * Validates OpenAI API credentials are present
 * @param {object} env - The environment object with API keys
 * @returns {object} - Result object with isValid boolean and error message if invalid
 */
export function validateOpenAiCredentials(env) {
  if (!env.OPENAI_API_KEY) {
    return {
      isValid: false,
      error: 'OpenAI API credentials not configured'
    };
  }
  
  return {
    isValid: true
  };
}