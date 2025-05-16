import { v4 as uuidv4 } from 'uuid';
import db from './db';
import foodService from './foodService';
import recipeService from './recipeService';
import { Menu, Food, Recipe, NutritionInfo, MenuItem } from '../types';

export class MenuService {
  /**
   * Create a new menu
   */
  async createMenu(menu: Omit<Menu, '_id' | 'type' | 'createdAt' | 'updatedAt'>): Promise<Menu> {
    const newMenu: Menu = {
      _id: `menu_${uuidv4()}`,
      type: 'menu',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...menu
    };

    return await db.put(newMenu);
  }

  /**
   * Get a menu by ID
   */
  async getMenuById(id: string): Promise<Menu> {
    return await db.get<Menu>(id);
  }

  /**
   * Update an existing menu
   */
  async updateMenu(menu: Menu): Promise<Menu> {
    return await db.put(menu);
  }

  /**
   * Delete a menu
   */
  async deleteMenu(id: string, rev: string): Promise<void> {
    await db.remove(id, rev);
  }

  /**
   * Get all menus
   */
  async getAllMenus(): Promise<Menu[]> {
    return await db.getByType<Menu>('menu', {
      sort: [{ date: 'desc' }]
    });
  }

  /**
   * Get menus by date range
   */
  async getMenusByDateRange(startDate: string, endDate: string): Promise<Menu[]> {
    return await db.find<Menu>({
      type: 'menu',
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }, {
      sort: [{ date: 'asc' }]
    });
  }

  /**
   * Calculate the total nutritional information for a menu
   */
  async calculateMenuNutrition(menu: Menu): Promise<NutritionInfo> {
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
    
    // Fetch and calculate nutrition for each menu item
    for (const item of menu.items) {
      try {
        if (item.type === 'food') {
          // Get the food item
          const food = await foodService.getFoodById(item.itemId);
          
          // Calculate nutrition for this food
          const foodNutrition = this.calculateFoodItemNutrition(food, item.portions);
          
          // Add to the total
          this.addNutritionValues(nutrition, foodNutrition);
          
        } else if (item.type === 'recipe') {
          // Get the recipe
          const recipe = await recipeService.getRecipeById(item.itemId);
          
          // Calculate nutrition for this recipe
          const recipeNutrition = await this.calculateRecipeItemNutrition(recipe, item.portions);
          
          // Add to the total
          this.addNutritionValues(nutrition, recipeNutrition);
        }
      } catch (error) {
        console.error(`Error calculating nutrition for menu item ${item.itemId}:`, error);
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
   * Calculate nutrition for a food item in the menu
   */
  private calculateFoodItemNutrition(food: Food, portions: number): NutritionInfo {
    // For a food item, a portion is considered one serving
    return foodService.calculateNutrition(
      food,
      food.serving.size * portions,
      food.serving.unit
    );
  }

  /**
   * Calculate nutrition for a recipe item in the menu
   */
  private async calculateRecipeItemNutrition(recipe: Recipe, portions: number): Promise<NutritionInfo> {
    // Calculate the total recipe nutrition
    const recipeNutrition = await recipeService.calculateRecipeNutrition(recipe);
    
    // Calculate nutrition for the specified number of portions
    // (one portion is considered one serving of the recipe)
    const portionFactor = portions / recipe.servings;
    
    return this.multiplyNutritionByFactor(recipeNutrition, portionFactor);
  }

  /**
   * Multiply all nutrition values by a factor
   */
  private multiplyNutritionByFactor(nutrition: NutritionInfo, factor: number): NutritionInfo {
    const result: NutritionInfo = {
      calories: nutrition.calories * factor,
      protein: nutrition.protein * factor,
      carbs: nutrition.carbs * factor,
      fat: nutrition.fat * factor
    };
    
    // Process optional fields
    if (nutrition.fiber !== undefined) {
      result.fiber = nutrition.fiber * factor;
    }
    
    if (nutrition.sugar !== undefined) {
      result.sugar = nutrition.sugar * factor;
    }
    
    if (nutrition.sodium !== undefined) {
      result.sodium = nutrition.sodium * factor;
    }
    
    if (nutrition.cholesterol !== undefined) {
      result.cholesterol = nutrition.cholesterol * factor;
    }
    
    // Process vitamins and minerals
    if (nutrition.vitamins) {
      result.vitamins = {};
      for (const [vitamin, value] of Object.entries(nutrition.vitamins)) {
        result.vitamins[vitamin] = value * factor;
      }
    }
    
    if (nutrition.minerals) {
      result.minerals = {};
      for (const [mineral, value] of Object.entries(nutrition.minerals)) {
        result.minerals[mineral] = value * factor;
      }
    }
    
    return result;
  }

  /**
   * Add nutrition values from one object to another
   */
  private addNutritionValues(target: NutritionInfo, source: NutritionInfo): void {
    target.calories += source.calories;
    target.protein += source.protein;
    target.carbs += source.carbs;
    target.fat += source.fat;
    
    // Add optional nutrients if they exist
    if (source.fiber) {
      target.fiber! += source.fiber;
    }
    
    if (source.sugar) {
      target.sugar! += source.sugar;
    }
    
    if (source.sodium) {
      target.sodium! += source.sodium;
    }
    
    if (source.cholesterol) {
      target.cholesterol! += source.cholesterol;
    }
    
    // Process vitamins
    if (source.vitamins) {
      if (!target.vitamins) target.vitamins = {};
      for (const [vitamin, value] of Object.entries(source.vitamins)) {
        target.vitamins[vitamin] = (target.vitamins[vitamin] || 0) + value;
      }
    }
    
    // Process minerals
    if (source.minerals) {
      if (!target.minerals) target.minerals = {};
      for (const [mineral, value] of Object.entries(source.minerals)) {
        target.minerals[mineral] = (target.minerals[mineral] || 0) + value;
      }
    }
  }

  /**
   * Validate all items in a menu to ensure they exist
   */
  async validateMenuItems(items: MenuItem[]): Promise<{ valid: boolean; missingItems: string[] }> {
    const missingItems: string[] = [];
    
    for (const item of items) {
      try {
        if (item.type === 'food') {
          await foodService.getFoodById(item.itemId);
        } else if (item.type === 'recipe') {
          await recipeService.getRecipeById(item.itemId);
        }
      } catch (error) {
        missingItems.push(item.itemId);
      }
    }
    
    return {
      valid: missingItems.length === 0,
      missingItems
    };
  }
}

export default new MenuService();