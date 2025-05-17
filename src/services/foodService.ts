import { v4 as uuidv4 } from 'uuid';
import db from './db';
import { DocumentTypes, createFoodDocument } from '../models.js';

// For TypeScript type checking
import type { Food, NutritionInfo, ServingInfo } from '../types';

export class FoodService {
  /**
   * Calculate calories from macronutrients using the Atwater system
   * Protein: 4 calories per gram
   * Carbohydrates: 4 calories per gram
   * Fat: 9 calories per gram
   */
  calculateCaloriesFromMacros(protein: number, carbs: number, fat: number): number {
    // Use the Atwater system
    const caloriesFromProtein = protein * 4;
    const caloriesFromCarbs = carbs * 4;
    const caloriesFromFat = fat * 9;
    
    // Round to 2 decimal places
    const totalCalories = Math.round((caloriesFromProtein + caloriesFromCarbs + caloriesFromFat) * 100) / 100;
    
    console.log(`Calories calculation:
      - From protein: ${protein}g × 4 = ${caloriesFromProtein} calories
      - From carbs: ${carbs}g × 4 = ${caloriesFromCarbs} calories
      - From fat: ${fat}g × 9 = ${caloriesFromFat} calories
      - Total: ${totalCalories} calories
    `);
    
    return totalCalories;
  }
  
  /**
   * Create a new food item
   */
  async createFood(food: Omit<Food, '_id' | 'type' | 'createdAt' | 'updatedAt'>): Promise<Food> {
    // Ensure calories are calculated from macros
    const calculatedFood = {
      ...food,
      nutrients: {
        ...food.nutrients,
        calories: this.calculateCaloriesFromMacros(
          food.nutrients.protein,
          food.nutrients.carbs,
          food.nutrients.fat
        )
      }
    };
    
    // Ensure weightInGrams is set for 'g' units
    if (calculatedFood.serving.unit === 'g' && calculatedFood.serving.weightInGrams === undefined) {
      calculatedFood.serving.weightInGrams = calculatedFood.serving.size;
    }
    
    const newFood = createFoodDocument({
      _id: `food_${uuidv4()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...calculatedFood
    });

    return await db.put(newFood);
  }

  /**
   * Get a food item by ID
   */
  async getFoodById(id: string): Promise<Food> {
    return await db.get<Food>(id);
  }

  /**
   * Update an existing food item
   */
  async updateFood(food: Food): Promise<Food> {
    // Ensure calories are calculated from macros
    const calculatedFood = {
      ...food,
      nutrients: {
        ...food.nutrients,
        calories: this.calculateCaloriesFromMacros(
          food.nutrients.protein,
          food.nutrients.carbs,
          food.nutrients.fat
        )
      }
    };
    
    // Ensure weightInGrams is set for 'g' units
    if (calculatedFood.serving.unit === 'g' && calculatedFood.serving.weightInGrams === undefined) {
      calculatedFood.serving.weightInGrams = calculatedFood.serving.size;
    }
    
    return await db.put(calculatedFood);
  }

  /**
   * Delete a food item
   */
  async deleteFood(id: string, rev: string): Promise<void> {
    await db.remove(id, rev);
  }

  /**
   * Get all food items
   */
  async getAllFoods(): Promise<Food[]> {
    console.log('FoodService.getAllFoods called');
    
    try {
      // Use the Database class's dedicated method for getting foods
      return await db.getAllFoods();
    } catch (error) {
      console.error('Error in FoodService.getAllFoods:', error);
      
      // Since the db.ts methods already have multiple fallbacks,
      // we should rarely get to this point. But if we do, just return empty array.
      console.warn('Returning empty food array as last resort');
      return [];
    }
  }

  /**
   * Search for food items
   */
  async searchFoods(query: string): Promise<Food[]> {
    // PouchDB doesn't support full-text search natively
    // This is a simple solution that filters results in memory
    const allFoods = await this.getAllFoods();
    const lowerQuery = query.toLowerCase();
    
    return allFoods.filter(food => 
      food.name.toLowerCase().includes(lowerQuery) || 
      food.category.toLowerCase().includes(lowerQuery) ||
      (food.tags && food.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
  }

  /**
   * Get food items by category
   */
  async getFoodsByCategory(category: string): Promise<Food[]> {
    console.log(`FoodService.getFoodsByCategory called for category: ${category}`);
    
    try {
      // Use the find method with proper selector
      const result = await db.find<Food>(
        {
          type: DocumentTypes.FOOD,
          category: category
        }
      );
      
      // Sort foods by name after retrieving them
      return result.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error(`Error in getFoodsByCategory for ${category}:`, error);
      
      // Simple fallback - get all foods and filter
      try {
        console.log('Falling back to getAllFoods with in-memory filtering');
        const allFoods = await this.getAllFoods();
        return allFoods.filter(food => food.category === category);
      } catch (fallbackError) {
        console.error('Final fallback error:', fallbackError);
        return []; 
      }
    }
  }

  /**
   * Calculate nutrition for a quantity of food
   */
  calculateNutrition(food: Food, quantity: number, unit: string): NutritionInfo {
    console.log(`Calculating nutrition for ${quantity} ${unit} of ${food.name}`);
    
    // Convert quantity to the same unit as the serving size if needed
    let conversionFactor = this.convertUnit(quantity, unit, food.serving);
    console.log(`Conversion factor: ${conversionFactor} (${quantity} ${unit} relative to ${food.serving.size} ${food.serving.unit})`);
    
    if (isNaN(conversionFactor) || conversionFactor <= 0) {
      console.error(`Invalid conversion factor: ${conversionFactor}. Using 1 instead.`);
      // Fallback to a safe value if conversion fails
      conversionFactor = 1;
    }
    
    // Calculate the nutritional values based on the quantity
    const adjustedProtein = Math.round((food.nutrients.protein * conversionFactor) * 1000) / 1000;
    const adjustedCarbs = Math.round((food.nutrients.carbs * conversionFactor) * 1000) / 1000;
    const adjustedFat = Math.round((food.nutrients.fat * conversionFactor) * 1000) / 1000;
    
    // Calculate calories from the adjusted macros
    const calculatedCalories = this.calculateCaloriesFromMacros(
      adjustedProtein,
      adjustedCarbs,
      adjustedFat
    );
    
    const result: NutritionInfo = {
      calories: calculatedCalories,
      protein: adjustedProtein,
      carbs: adjustedCarbs,
      fat: adjustedFat,
    };
    
    console.log(`Base nutrition calculation:
      - Adjusted protein: ${food.nutrients.protein}g × ${conversionFactor} = ${result.protein}g
      - Adjusted carbs: ${food.nutrients.carbs}g × ${conversionFactor} = ${result.carbs}g
      - Adjusted fat: ${food.nutrients.fat}g × ${conversionFactor} = ${result.fat}g
      - Calculated calories: ${result.calories}
    `);
    
    // Add optional nutrients if they exist
    if (food.nutrients.fiber !== undefined) {
      result.fiber = Math.round((food.nutrients.fiber * conversionFactor) * 1000) / 1000;
      console.log(`Fiber: ${food.nutrients.fiber}g × ${conversionFactor} = ${result.fiber}g`);
    }
    
    if (food.nutrients.sugar !== undefined) {
      result.sugar = Math.round((food.nutrients.sugar * conversionFactor) * 1000) / 1000;
      console.log(`Sugar: ${food.nutrients.sugar}g × ${conversionFactor} = ${result.sugar}g`);
    }
    
    if (food.nutrients.sodium !== undefined) {
      result.sodium = Math.round((food.nutrients.sodium * conversionFactor) * 1000) / 1000;
      console.log(`Sodium: ${food.nutrients.sodium}mg × ${conversionFactor} = ${result.sodium}mg`);
    }
    
    if (food.nutrients.cholesterol !== undefined) {
      result.cholesterol = Math.round((food.nutrients.cholesterol * conversionFactor) * 1000) / 1000;
      console.log(`Cholesterol: ${food.nutrients.cholesterol}mg × ${conversionFactor} = ${result.cholesterol}mg`);
    }
    
    // Process vitamins and minerals if they exist
    if (food.nutrients.vitamins) {
      result.vitamins = {};
      for (const [vitamin, value] of Object.entries(food.nutrients.vitamins)) {
        result.vitamins[vitamin] = Math.round((value * conversionFactor) * 1000) / 1000;
        console.log(`Vitamin ${vitamin}: ${value} × ${conversionFactor} = ${result.vitamins[vitamin]}`);
      }
    }
    
    if (food.nutrients.minerals) {
      result.minerals = {};
      for (const [mineral, value] of Object.entries(food.nutrients.minerals)) {
        result.minerals[mineral] = Math.round((value * conversionFactor) * 1000) / 1000;
        console.log(`Mineral ${mineral}: ${value} × ${conversionFactor} = ${result.minerals[mineral]}`);
      }
    }
    
    console.log(`Final calculated nutrition for ${quantity} ${unit} of ${food.name}:`, result);
    return result;
  }

  /**
   * Convert between different units of measurement
   */
  private convertUnit(quantity: number, unit: string, serving: ServingInfo): number {
    console.log(`Converting ${quantity} ${unit} to ${serving.size} ${serving.unit}`);
    
    // If the units are the same, just calculate the ratio
    if (unit.toLowerCase() === serving.unit.toLowerCase()) {
      const ratio = quantity / serving.size;
      console.log(`Same units: ${unit} = ${serving.unit}, ratio: ${ratio}`);
      return ratio;
    }

    // Handle common unit conversions
    const fromUnit = unit.toLowerCase();
    const toUnit = serving.unit.toLowerCase();

    // Weight conversions
    const weightConversions: Record<string, Record<string, number>> = {
      'g': { 'kg': 0.001, 'oz': 0.03527396, 'lb': 0.00220462 },
      'kg': { 'g': 1000, 'oz': 35.27396, 'lb': 2.20462 },
      'oz': { 'g': 28.3495, 'kg': 0.0283495, 'lb': 0.0625 },
      'lb': { 'g': 453.592, 'kg': 0.453592, 'oz': 16 }
    };

    // Volume conversions
    const volumeConversions: Record<string, Record<string, number>> = {
      'ml': { 'l': 0.001, 'cup': 0.00416667, 'tbsp': 0.067628, 'tsp': 0.202884 },
      'l': { 'ml': 1000, 'cup': 4.16667, 'tbsp': 67.628, 'tsp': 202.884 },
      'cup': { 'ml': 240, 'l': 0.24, 'tbsp': 16, 'tsp': 48 },
      'tbsp': { 'ml': 14.7868, 'l': 0.0147868, 'cup': 0.0625, 'tsp': 3 },
      'tsp': { 'ml': 4.92892, 'l': 0.00492892, 'cup': 0.0208333, 'tbsp': 0.333333 }
    };

    // Special handling for "medium", "small", "large" units for foods like fruits and vegetables
    const sizeMappings: Record<string, Record<string, number>> = {
      // General size to weight (g) conversion for common foods
      'medium': { 'g': 1 },  // Will be treated as 1x the serving size
      'small': { 'g': 0.7 }, // Will be treated as 0.7x the serving size
      'large': { 'g': 1.3 }, // Will be treated as 1.3x the serving size
      'clove': { 'g': 1 },   // Clove of garlic will be treated as 1x the serving size
      'piece': { 'g': 1 },   // Will be treated as 1x the serving size
      'serving': { 'g': 1 }, // Will be treated as 1x the serving size
      'slice': { 'g': 1 },   // Will be treated as 1x the serving size
      'can': { 'g': 1 },     // Will be treated as 1x the serving size
      'bottle': { 'g': 1 },  // Will be treated as 1x the serving size
      'packet': { 'g': 1 },  // Will be treated as 1x the serving size
      'container': { 'g': 1 } // Will be treated as 1x the serving size
    };

    // Check if we're converting from a size descriptor (e.g., "medium", "clove") to a weight
    if (sizeMappings[fromUnit]) {
      console.log(`Converting from size descriptor '${fromUnit}' to ${toUnit}`);
      // For size descriptors, we treat them as multiples of the serving size
      const multiplier = sizeMappings[fromUnit]['g'];
      
      // The result will be a multiplier of the serving size
      console.log(`Size conversion: ${quantity} ${fromUnit} = ${quantity * multiplier} serving(s)`);
      return quantity * multiplier;
    }

    // Regular unit conversions
    if (weightConversions[fromUnit] && weightConversions[fromUnit][toUnit]) {
      // Convert to the target unit
      const converted = quantity * weightConversions[fromUnit][toUnit];
      // Return the ratio with the serving size
      const ratio = converted / serving.size;
      console.log(`Weight conversion: ${quantity} ${fromUnit} = ${converted} ${toUnit}, ratio: ${ratio}`);
      return ratio;
    }

    if (volumeConversions[fromUnit] && volumeConversions[fromUnit][toUnit]) {
      const converted = quantity * volumeConversions[fromUnit][toUnit];
      const ratio = converted / serving.size;
      console.log(`Volume conversion: ${quantity} ${fromUnit} = ${converted} ${toUnit}, ratio: ${ratio}`);
      return ratio;
    }

    // Handle cross-conversions between weight and volume for common ingredients
    // This is a simplification - in reality, density varies by ingredient
    
    // If we don't have a direct conversion, we need a more sophisticated approach
    console.warn(`No conversion found from ${fromUnit} to ${toUnit}. Assuming direct ratio.`);
    const ratio = quantity / serving.size; 
    console.log(`No conversion available, using direct ratio: ${ratio}`);
    return ratio;
  }
}

export default new FoodService();