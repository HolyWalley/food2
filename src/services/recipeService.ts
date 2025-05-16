import { v4 as uuidv4 } from 'uuid';
import db from './db';
import foodService from './foodService';
import { Recipe, Food, NutritionInfo, RecipeIngredient } from '../types';

export class RecipeService {
  /**
   * Create a new recipe
   */
  async createRecipe(recipe: Omit<Recipe, '_id' | 'type' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
    const newRecipe: Recipe = {
      _id: `recipe_${uuidv4()}`,
      type: 'recipe',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...recipe
    };

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
    return await db.getByType<Recipe>('recipe', {
      sort: [{ name: 'asc' }]
    });
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
   * Calculate the nutritional information for a recipe
   */
  async calculateRecipeNutrition(recipe: Recipe): Promise<NutritionInfo> {
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
    
    // Fetch and calculate nutrition for each ingredient
    for (const ingredient of recipe.ingredients) {
      try {
        // Get the food item
        const food = await foodService.getFoodById(ingredient.foodId);
        
        // Calculate nutrition for this ingredient
        const ingredientNutrition = foodService.calculateNutrition(
          food, 
          ingredient.quantity, 
          ingredient.unit
        );
        
        // Add to the total
        nutrition.calories += ingredientNutrition.calories;
        nutrition.protein += ingredientNutrition.protein;
        nutrition.carbs += ingredientNutrition.carbs;
        nutrition.fat += ingredientNutrition.fat;
        
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
      } catch (error) {
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