/**
 * Validates food data before saving to the database
 * This function can be deployed to Cloudflare Functions
 */
export async function onRequest(context) {
  try {
    // Get the food data from the request
    const foodData = await context.request.json();

    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (context.request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // Validate required fields
    if (!foodData.name || !foodData.category) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          errors: ['Name and category are required'] 
        }),
        { status: 400, headers }
      );
    }

    // Validate nutrients
    if (!foodData.nutrients) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          errors: ['Nutritional information is required'] 
        }),
        { status: 400, headers }
      );
    }

    const requiredNutrients = ['calories', 'protein', 'carbs', 'fat'];
    const missingNutrients = requiredNutrients.filter(
      nutrient => typeof foodData.nutrients[nutrient] !== 'number'
    );

    if (missingNutrients.length > 0) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          errors: [`Missing required nutrients: ${missingNutrients.join(', ')}`] 
        }),
        { status: 400, headers }
      );
    }

    // Validate serving information
    if (!foodData.serving || !foodData.serving.size || !foodData.serving.unit) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          errors: ['Serving size and unit are required'] 
        }),
        { status: 400, headers }
      );
    }

    // All validations passed
    return new Response(
      JSON.stringify({ 
        valid: true,
        // Add nutrition recommendations based on category
        recommendations: generateRecommendations(foodData)
      }),
      { status: 200, headers }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        valid: false, 
        errors: ['Invalid request data: ' + error.message] 
      }),
      { 
        status: 400, 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        } 
      }
    );
  }
}

/**
 * Generate recommendations for nutrient data based on food category
 */
function generateRecommendations(foodData) {
  const { category, nutrients } = foodData;
  const recommendations = [];

  // Check protein content for protein-rich categories
  if (
    (category === 'Proteins' && nutrients.protein < 15) ||
    (category === 'Dairy' && nutrients.protein < 5)
  ) {
    recommendations.push(
      `The protein content seems low for a ${category.toLowerCase()} item. Consider checking your values.`
    );
  }

  // Check carb content for carb-rich categories
  if (
    (category === 'Grains' && nutrients.carbs < 15) ||
    (category === 'Fruits' && nutrients.carbs < 10)
  ) {
    recommendations.push(
      `The carbohydrate content seems low for a ${category.toLowerCase()} item. Consider checking your values.`
    );
  }

  // Check fat content for fat-rich categories
  if (
    (category === 'Fats and Oils' && nutrients.fat < 8)
  ) {
    recommendations.push(
      `The fat content seems low for a ${category.toLowerCase()} item. Consider checking your values.`
    );
  }

  // Check calorie density
  const caloriesPerGram = nutrients.calories / (foodData.serving.size || 100);
  if (caloriesPerGram > 8 && category !== 'Fats and Oils') {
    recommendations.push(
      `This food has a very high calorie density (${caloriesPerGram.toFixed(1)} calories per gram). Please double-check your values.`
    );
  }

  // Check for nutrient balance
  const totalMacros = nutrients.protein * 4 + nutrients.carbs * 4 + nutrients.fat * 9;
  const calorieDiscrepancy = Math.abs(totalMacros - nutrients.calories);
  
  if (calorieDiscrepancy > 20) {
    recommendations.push(
      `There's a significant discrepancy between the calories calculated from macronutrients (${totalMacros.toFixed(0)}) and the reported calories (${nutrients.calories}). Consider reviewing your values.`
    );
  }

  return recommendations;
}