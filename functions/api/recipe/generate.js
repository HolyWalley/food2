/**
 * Recipe generation API endpoint
 * Generates recipe using OpenAI and processes ingredients with Nutritionix
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
    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OpenAI API credentials not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!env.NUTRITIONIX_APP_ID || !env.NUTRITIONIX_API_KEY) {
      return new Response(JSON.stringify({ error: 'Nutritionix API credentials not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Parse request body
    let params = {};
    try {
      params = await request.json();
    } catch (e) {
      // If request body is empty or invalid, use empty params
      console.log('No request body or invalid JSON, using default parameters');
    }
    
    // Extract prompt parameter
    const { prompt } = params;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return new Response(JSON.stringify({ error: 'Recipe prompt is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Generate recipe using OpenAI with the prompt
    const recipeData = await generateRecipeWithOpenAI(env.OPENAI_API_KEY, prompt);
    
    if (!recipeData || !recipeData.ingredients || recipeData.ingredients.length === 0) {
      throw new Error('Failed to generate valid recipe data');
    }
    
    // Process ingredients using Nutritionix
    const processedIngredients = await processIngredients(
      recipeData.ingredients,
      env.NUTRITIONIX_APP_ID,
      env.NUTRITIONIX_API_KEY,
      env.FOOD_CACHE
    );
    
    // Combine the recipe with processed ingredients
    const completeRecipe = {
      ...recipeData,
      processedIngredients
    };
    
    return new Response(JSON.stringify(completeRecipe), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Error generating recipe:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to generate recipe',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * Generate a recipe using OpenAI with function calling
 */
async function generateRecipeWithOpenAI(apiKey, prompt) {
  // Build system prompt with specific instructions for ingredient naming
  const systemPrompt = 'You are a helpful assistant that creates detailed, accurate recipes. When listing ingredients, always use specific, definitive names without variations or alternatives. For example, use "Parmesan cheese" not "grated cheese (e.g. Kefalotyri or Parmesan)". Each ingredient should have exactly one precise name that clearly identifies what it is, without parenthetical alternatives or options.';
  
  // Create user prompt from the provided prompt
  const userPrompt = `Please create a detailed recipe for: ${prompt}. Use specific, single ingredient names without offering alternatives in parentheses. For example, write "Parmesan cheese" not "cheese (Parmesan or Pecorino)".`;
  
  // Define the function schema for structured output
  const functions = [
    {
      name: 'create_recipe',
      description: 'Create a complete recipe with all required details',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the recipe'
          },
          description: {
            type: 'string',
            description: 'A brief description of the recipe'
          },
          ingredients: {
            type: 'array',
            description: 'List of ingredients with quantities and units',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Specific, singular name of the ingredient without alternatives or variations (e.g., "tomato", "chicken breast", "Parmesan cheese"). Do not include options or alternatives in parentheses.'
                },
                quantity: {
                  type: 'number',
                  description: 'Quantity of the ingredient'
                },
                unit: {
                  type: 'string',
                  description: 'Unit of measurement (e.g., "g", "cup", "tbsp", "piece")'
                }
              },
              required: ['name', 'quantity', 'unit']
            }
          },
          instructions: {
            type: 'array',
            description: 'Step-by-step cooking instructions',
            items: {
              type: 'string'
            }
          },
          servings: {
            type: 'number',
            description: 'Number of servings the recipe makes'
          },
          prepTime: {
            type: 'number',
            description: 'Preparation time in minutes'
          },
          cookTime: {
            type: 'number',
            description: 'Cooking time in minutes'
          },
          tags: {
            type: 'array',
            description: 'Tags for categorizing the recipe',
            items: {
              type: 'string'
            }
          }
        },
        required: ['name', 'description', 'ingredients', 'instructions', 'servings', 'prepTime', 'cookTime']
      }
    }
  ];
  
  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      functions,
      function_call: { name: 'create_recipe' }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Extract function call arguments
  if (data.choices && 
      data.choices[0] && 
      data.choices[0].message && 
      data.choices[0].message.function_call) {
    try {
      return JSON.parse(data.choices[0].message.function_call.arguments);
    } catch (error) {
      console.error('Error parsing OpenAI function call arguments:', error);
      throw new Error('Failed to parse recipe data from AI response');
    }
  } else {
    throw new Error('OpenAI response did not contain expected function call');
  }
}

/**
 * Process each ingredient to get nutritional information from Nutritionix
 */
async function processIngredients(ingredients, appId, appKey, cache) {
  // Process all ingredients in parallel
  const processedIngredientsPromises = ingredients.map(async (ingredient) => {
    try {
      // Format the query string for Nutritionix
      const query = `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`;
      
      // Create cache key for this specific ingredient
      const cacheKey = `recipe-ingredient:${query.toLowerCase()}`;
      
      // Check cache first
      let cachedData;
      if (cache) {
        cachedData = await cache.get(cacheKey);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      }
      
      // Call Nutritionix API to get nutrient data
      const nutritionixUrl = 'https://trackapi.nutritionix.com/v2/natural/nutrients';
      const response = await fetch(nutritionixUrl, {
        method: 'POST',
        headers: {
          'x-app-id': appId,
          'x-app-key': appKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query
        })
      });
      
      if (!response.ok) {
        throw new Error(`Nutritionix API error: ${response.status}`);
      }
      
      const nutritionData = await response.json();
      
      // Only use the first item from the response (most relevant)
      if (!nutritionData.foods || nutritionData.foods.length === 0) {
        throw new Error('No nutrition data found for ingredient');
      }
      
      const foodData = nutritionData.foods[0];
      
      // Map Nutritionix data to our app's format
      const processedIngredient = {
        original: ingredient,
        food: {
          name: ingredient.name,
          nutrients: {
            calories: foodData.nf_calories,
            protein: foodData.nf_protein,
            carbs: foodData.nf_total_carbohydrate,
            fat: foodData.nf_total_fat
          },
          serving: {
            size: foodData.serving_qty,
            unit: mapNutritionixUnit(foodData.serving_unit, foodData.food_name),
            weightInGrams: foodData.serving_weight_grams
          },
          category: determineFoodCategory(foodData.food_name),
          // Add nutritionix ID for better deduplication
          nutritionixId: foodData.food_name || foodData.tag_id,
          // Add common name to help with matching
          commonName: foodData.food_name
        },
        // Information needed for recipe ingredients
        quantity: ingredient.quantity,
        unit: ingredient.unit
      };
      
      // Add optional nutrients if available
      if (foodData.nf_dietary_fiber) processedIngredient.food.nutrients.fiber = foodData.nf_dietary_fiber;
      if (foodData.nf_sugars) processedIngredient.food.nutrients.sugar = foodData.nf_sugars;
      if (foodData.nf_sodium) processedIngredient.food.nutrients.sodium = foodData.nf_sodium;
      if (foodData.nf_cholesterol) processedIngredient.food.nutrients.cholesterol = foodData.nf_cholesterol;
      
      // Add additional identifiers from Nutritionix that help with deduplication
      if (foodData.nix_item_id) processedIngredient.food.nixItemId = foodData.nix_item_id;
      if (foodData.nix_brand_id) processedIngredient.food.nixBrandId = foodData.nix_brand_id;
      if (foodData.ndb_number) processedIngredient.food.ndbNumber = foodData.ndb_number;
      if (foodData.alt_measures && foodData.alt_measures.length > 0) {
        processedIngredient.food.altMeasures = foodData.alt_measures;
      }
      
      // Store in cache if available
      if (cache) {
        await cache.put(cacheKey, JSON.stringify(processedIngredient), { expirationTtl: 2592000 });
      }
      
      return processedIngredient;
    } catch (error) {
      console.error(`Error processing ingredient '${ingredient.name}':`, error);
      
      // Return the original ingredient with placeholder nutrition data
      return {
        original: ingredient,
        food: {
          name: ingredient.name,
          nutrients: {
            calories: 100, // Default placeholder values
            protein: 2,
            carbs: 10,
            fat: 5
          },
          serving: {
            size: ingredient.quantity,
            unit: ingredient.unit,
            weightInGrams: 100 // Default placeholder value
          },
          category: determineFoodCategory(ingredient.name)
        },
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        error: error.message
      };
    }
  });
  
  // Wait for all ingredient processing to complete
  return Promise.all(processedIngredientsPromises);
}

/**
 * Maps a Nutritionix serving unit to our standard units
 */
function mapNutritionixUnit(nutritionixUnit, foodName) {
  // Direct mappings
  const unitMappings = {
    'g': 'g',
    'oz': 'oz',
    'lb': 'lb',
    'ml': 'ml',
    'l': 'l',
    'cup': 'cup',
    'tbsp': 'tbsp',
    'tsp': 'tsp',
    'small': 'small',
    'medium': 'medium',
    'large': 'large',
    'whole': 'piece',
    'item': 'piece',
    'serving': 'serving',
    'clove': 'clove',
    'slice': 'slice',
    'can': 'can',
    'bottle': 'bottle',
    'packet': 'packet',
    'container': 'container',
    'pack': 'packet',
    'box': 'container',
  };
  
  if (!nutritionixUnit) {
    return 'piece';
  }
  
  const lowerUnit = nutritionixUnit.toLowerCase();
  
  // First try direct mapping
  if (unitMappings[lowerUnit]) {
    return unitMappings[lowerUnit];
  }
  
  // Try to find a match by analyzing parts of the unit string
  if (lowerUnit.includes('small')) return 'small';
  if (lowerUnit.includes('medium')) return 'medium';
  if (lowerUnit.includes('large')) return 'large';
  if (lowerUnit.includes('slice')) return 'slice';
  if (lowerUnit.includes('clove')) return 'clove';
  if (lowerUnit.includes('can')) return 'can';
  if (lowerUnit.includes('bottle')) return 'bottle';
  if (lowerUnit.includes('packet') || lowerUnit.includes('pack')) return 'packet';
  if (lowerUnit.includes('container') || lowerUnit.includes('box')) return 'container';
  
  // If no match, default based on context
  if (lowerUnit.includes('whole') || lowerUnit.includes('item')) {
    return 'piece';
  }
  
  // Last resort
  return 'piece';
}

/**
 * Determine a food category based on its name
 */
function determineFoodCategory(foodName) {
  if (!foodName) return 'Other';
  
  const name = foodName.toLowerCase();
  
  // Protein foods
  if (name.includes('chicken') || name.includes('beef') || 
      name.includes('pork') || name.includes('fish') || 
      name.includes('tofu') || name.includes('egg')) {
    return 'Proteins';
  }
  
  // Fruits
  if (name.includes('apple') || name.includes('banana') || 
      name.includes('berry') || name.includes('fruit') ||
      name.includes('orange') || name.includes('grape') ||
      name.includes('melon')) {
    return 'Fruits';
  }
  
  // Vegetables
  if (name.includes('broccoli') || name.includes('spinach') ||
      name.includes('carrot') || name.includes('celery') ||
      name.includes('lettuce') || name.includes('potato') ||
      name.includes('vegetable') || name.includes('onion') ||
      name.includes('tomato') || name.includes('garlic')) {
    return 'Vegetables';
  }
  
  // Grains
  if (name.includes('bread') || name.includes('pasta') ||
      name.includes('rice') || name.includes('oat') ||
      name.includes('cereal') || name.includes('flour') ||
      name.includes('grain')) {
    return 'Grains';
  }
  
  // Dairy
  if (name.includes('milk') || name.includes('cheese') ||
      name.includes('yogurt') || name.includes('butter') ||
      name.includes('cream') || name.includes('dairy')) {
    return 'Dairy';
  }
  
  // Default category
  return 'Other';
}