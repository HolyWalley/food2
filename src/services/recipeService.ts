import { v4 as uuidv4 } from 'uuid';
import db from './db';
import foodService from './foodService';
import { createRecipeDocument } from '../models.js';

// For TypeScript type checking only
import type { Recipe, RecipeIngredient, NutritionInfo } from '../types';

export class RecipeService {
  /**
   * Create a new recipe
   */
  async createRecipe(recipe: Omit<Recipe, '_id' | 'type' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
    const newRecipe = createRecipeDocument({
      _id: `recipe_${uuidv4()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...recipe
    });

    return await db.put(newRecipe);
  }

  /**
   * Get a recipe by ID
   */
  async getRecipeById(id: string): Promise<Recipe> {
    return await db.get<Recipe>(id);
  }

  /**
   * Update an existing recipe
   */
  async updateRecipe(recipe: Recipe): Promise<Recipe> {
    return await db.put(recipe);
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(id: string, rev: string): Promise<void> {
    await db.remove(id, rev);
  }

  /**
   * Get all recipes
   */
  async getAllRecipes(): Promise<Recipe[]> {
    console.log('RecipeService.getAllRecipes called');
    
    try {
      // Use the Database class's dedicated method for getting recipes
      return await db.getAllRecipes();
    } catch (error) {
      console.error('Error in RecipeService.getAllRecipes:', error);
      
      // Since the db.ts methods already have fallbacks,
      // we should rarely get to this point, but we'll handle it anyway
      console.warn('Returning empty recipe array as last resort');
      return [];
    }
  }

  /**
   * Search for recipes
   */
  async searchRecipes(query: string): Promise<Recipe[]> {
    const allRecipes = await this.getAllRecipes();
    const lowerQuery = query.toLowerCase();
    
    return allRecipes.filter(recipe => 
      recipe.name.toLowerCase().includes(lowerQuery) || 
      recipe.description.toLowerCase().includes(lowerQuery) ||
      (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
      recipe.instructions.some(instruction => instruction.toLowerCase().includes(lowerQuery))
    );
  }
  
  /**
   * Get paginated recipes with optional search term
   */
  async getPaginatedRecipes(page = 1, limit = 10, searchTerm = ''): Promise<{recipes: Recipe[], total: number}> {
    try {
      // Get all recipes first (we'll paginate in memory since PouchDB doesn't have built-in pagination)
      let filteredRecipes: Recipe[];
      
      if (searchTerm) {
        filteredRecipes = await this.searchRecipes(searchTerm);
      } else {
        filteredRecipes = await this.getAllRecipes();
      }
      
      // Sort recipes alphabetically by name
      filteredRecipes.sort((a, b) => a.name.localeCompare(b.name));
      
      // Calculate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      // Return the paginated subset
      return {
        recipes: filteredRecipes.slice(startIndex, endIndex),
        total: filteredRecipes.length
      };
    } catch (error) {
      console.error('Error getting paginated recipes:', error);
      return { recipes: [], total: 0 };
    }
  }

  /**
   * Calculate the nutritional information for a recipe
   */
  async calculateRecipeNutrition(recipe: Recipe): Promise<NutritionInfo> {
    console.log('Calculating nutrition for recipe:', recipe.name);
    
    // Initialize the nutrition object with zeros
    const nutrition: NutritionInfo = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
      vitamins: {},
      minerals: {}
    };
    
    console.log('Recipe ingredients:', JSON.stringify(recipe.ingredients, null, 2));
    
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      console.warn('Recipe has no ingredients!');
      return nutrition;
    }
    
    // Fetch and calculate nutrition for each ingredient
    for (const ingredient of recipe.ingredients) {
      try {
        if (!ingredient.foodId) {
          console.error('Ingredient missing foodId:', ingredient);
          continue;
        }
        
        console.log(`Processing ingredient: ${ingredient.quantity} ${ingredient.unit} of food ID ${ingredient.foodId}`);
        
        // Get the food item
        const food = await foodService.getFoodById(ingredient.foodId);
        console.log('Found food:', food.name);
        console.log('Food serving:', JSON.stringify(food.serving));
        console.log('Food nutrients:', JSON.stringify(food.nutrients));
        
        // Calculate nutrition for this ingredient
        const ingredientNutrition = foodService.calculateNutrition(
          food, 
          ingredient.quantity, 
          ingredient.unit
        );
        
        console.log(`Nutrition for ${food.name} (${ingredient.quantity} ${ingredient.unit}):`, JSON.stringify(ingredientNutrition, null, 2));
        
        // Add to the total
        nutrition.calories += ingredientNutrition.calories || 0;
        nutrition.protein += ingredientNutrition.protein || 0;
        nutrition.carbs += ingredientNutrition.carbs || 0;
        nutrition.fat += ingredientNutrition.fat || 0;
        
        console.log(`Running total - Calories: ${nutrition.calories}, Protein: ${nutrition.protein}g, Carbs: ${nutrition.carbs}g, Fat: ${nutrition.fat}g`);
        
        // Add optional nutrients if they exist
        if (ingredientNutrition.fiber) {
          nutrition.fiber! += ingredientNutrition.fiber;
        }
        
        if (ingredientNutrition.sugar) {
          nutrition.sugar! += ingredientNutrition.sugar;
        }
        
        if (ingredientNutrition.sodium) {
          nutrition.sodium! += ingredientNutrition.sodium;
        }
        
        if (ingredientNutrition.cholesterol) {
          nutrition.cholesterol! += ingredientNutrition.cholesterol;
        }
        
        // Process vitamins
        if (ingredientNutrition.vitamins) {
          for (const [vitamin, value] of Object.entries(ingredientNutrition.vitamins)) {
            nutrition.vitamins![vitamin] = (nutrition.vitamins![vitamin] || 0) + value;
          }
        }
        
        // Process minerals
        if (ingredientNutrition.minerals) {
          for (const [mineral, value] of Object.entries(ingredientNutrition.minerals)) {
            nutrition.minerals![mineral] = (nutrition.minerals![mineral] || 0) + value;
          }
        }
      } catch (error) {
        console.error(`Error calculating nutrition for ingredient ${ingredient.foodId}:`, error);
      }
    }
    
    // Remove optional fields if they're zero or empty
    if (nutrition.fiber === 0) delete nutrition.fiber;
    if (nutrition.sugar === 0) delete nutrition.sugar;
    if (nutrition.sodium === 0) delete nutrition.sodium;
    if (nutrition.cholesterol === 0) delete nutrition.cholesterol;
    if (Object.keys(nutrition.vitamins!).length === 0) delete nutrition.vitamins;
    if (Object.keys(nutrition.minerals!).length === 0) delete nutrition.minerals;
    
    console.log('Final recipe nutrition:', JSON.stringify(nutrition, null, 2));
    return nutrition;
  }

  /**
   * Calculate nutrition per serving
   */
  async calculateNutritionPerServing(recipe: Recipe): Promise<NutritionInfo> {
    const totalNutrition = await this.calculateRecipeNutrition(recipe);
    const servings = recipe.servings || 1;
    
    // Create a new nutrition object with values divided by servings
    const perServing: NutritionInfo = {
      calories: totalNutrition.calories / servings,
      protein: totalNutrition.protein / servings,
      carbs: totalNutrition.carbs / servings,
      fat: totalNutrition.fat / servings
    };
    
    // Process optional fields
    if (totalNutrition.fiber !== undefined) {
      perServing.fiber = totalNutrition.fiber / servings;
    }
    
    if (totalNutrition.sugar !== undefined) {
      perServing.sugar = totalNutrition.sugar / servings;
    }
    
    if (totalNutrition.sodium !== undefined) {
      perServing.sodium = totalNutrition.sodium / servings;
    }
    
    if (totalNutrition.cholesterol !== undefined) {
      perServing.cholesterol = totalNutrition.cholesterol / servings;
    }
    
    // Process vitamins and minerals
    if (totalNutrition.vitamins) {
      perServing.vitamins = {};
      for (const [vitamin, value] of Object.entries(totalNutrition.vitamins)) {
        perServing.vitamins[vitamin] = value / servings;
      }
    }
    
    if (totalNutrition.minerals) {
      perServing.minerals = {};
      for (const [mineral, value] of Object.entries(totalNutrition.minerals)) {
        perServing.minerals[mineral] = value / servings;
      }
    }
    
    return perServing;
  }

  /**
   * Check if all ingredients for a recipe are available
   */
  async validateIngredients(ingredients: RecipeIngredient[]): Promise<{ valid: boolean; missingIngredients: string[] }> {
    const missingIngredients: string[] = [];
    
    for (const ingredient of ingredients) {
      try {
        // Try to get the food item
        await foodService.getFoodById(ingredient.foodId);
      } catch {
        // If we can't find the food, add it to missingIngredients
        missingIngredients.push(ingredient.foodId);
      }
    }
    
    return {
      valid: missingIngredients.length === 0,
      missingIngredients
    };
  }
}

export default new RecipeService();