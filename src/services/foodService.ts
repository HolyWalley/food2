import { v4 as uuidv4 } from 'uuid';
import db from './db';
import { DocumentTypes, createFoodDocument } from '../models.js';

// For TypeScript type checking
import type { Food, NutritionInfo, ServingInfo } from '../types';

export class FoodService {
  /**
   * Create a new food item
   */
  async createFood(food: Omit<Food, '_id' | 'type' | 'createdAt' | 'updatedAt'>): Promise<Food> {
    const newFood = createFoodDocument({
      _id: `food_${uuidv4()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...food
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
    return await db.put(food);
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
    try {
      console.log('Fetching all foods with basic type filter');
      // Use the most basic query possible with no sorting in PouchDB
      const result = await db.find<Food>(
        {
          type: DocumentTypes.FOOD
        },
        {
          // Don't specify any indexes or sorting
        }
      );
      
      // Sort in JavaScript instead of PouchDB
      return result.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error in getAllFoods:', error);
      
      // Even more basic fallback approach
      try {
        console.log('Trying with allDocs as fallback');
        // Use allDocs to get everything, then filter in JS
        const response = await (db as any).db.allDocs({ include_docs: true });
        const allDocs = response.rows.map(row => row.doc);
        
        // Filter for food documents and sort by name
        return allDocs
          .filter(doc => doc.type === DocumentTypes.FOOD)
          .sort((a, b) => a.name.localeCompare(b.name));
      } catch (fallbackError) {
        console.error('Final fallback error:', fallbackError);
        return []; // Return empty array as last resort
      }
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
    try {
      console.log(`Fetching foods by category: ${category}`);
      // Use the most basic query possible
      const result = await db.find<Food>(
        {
          type: DocumentTypes.FOOD,
          category
        },
        {
          // No sorting, no index specification
        }
      );
      
      // Sort manually in JavaScript
      return result.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error(`Error in getFoodsByCategory for ${category}:`, error);
      
      // Fallback to using getAllFoods and then filtering
      console.log('Falling back to getAllFoods with filtering');
      try {
        const allFoods = await this.getAllFoods();
        return allFoods.filter(food => food.category === category);
      } catch (fallbackError) {
        console.error('Final fallback error:', fallbackError);
        return []; // Return empty array as last resort
      }
    }
  }

  /**
   * Calculate nutrition for a quantity of food
   */
  calculateNutrition(food: Food, quantity: number, unit: string): NutritionInfo {
    // Convert quantity to the same unit as the serving size if needed
    const conversionFactor = this.convertUnit(quantity, unit, food.serving);
    
    // Calculate the nutritional values based on the quantity
    const result: NutritionInfo = {
      calories: food.nutrients.calories * conversionFactor,
      protein: food.nutrients.protein * conversionFactor,
      carbs: food.nutrients.carbs * conversionFactor,
      fat: food.nutrients.fat * conversionFactor,
    };
    
    // Add optional nutrients if they exist
    if (food.nutrients.fiber !== undefined) {
      result.fiber = food.nutrients.fiber * conversionFactor;
    }
    
    if (food.nutrients.sugar !== undefined) {
      result.sugar = food.nutrients.sugar * conversionFactor;
    }
    
    if (food.nutrients.sodium !== undefined) {
      result.sodium = food.nutrients.sodium * conversionFactor;
    }
    
    if (food.nutrients.cholesterol !== undefined) {
      result.cholesterol = food.nutrients.cholesterol * conversionFactor;
    }
    
    // Process vitamins and minerals if they exist
    if (food.nutrients.vitamins) {
      result.vitamins = {};
      for (const [vitamin, value] of Object.entries(food.nutrients.vitamins)) {
        result.vitamins[vitamin] = value * conversionFactor;
      }
    }
    
    if (food.nutrients.minerals) {
      result.minerals = {};
      for (const [mineral, value] of Object.entries(food.nutrients.minerals)) {
        result.minerals[mineral] = value * conversionFactor;
      }
    }
    
    return result;
  }

  /**
   * Convert between different units of measurement
   */
  private convertUnit(quantity: number, unit: string, serving: ServingInfo): number {
    // If the units are the same, just calculate the ratio
    if (unit.toLowerCase() === serving.unit.toLowerCase()) {
      return quantity / serving.size;
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

    // Check if we have a conversion for the units
    if (weightConversions[fromUnit] && weightConversions[fromUnit][toUnit]) {
      // Convert to the target unit
      const converted = quantity * weightConversions[fromUnit][toUnit];
      // Return the ratio with the serving size
      return converted / serving.size;
    }

    if (volumeConversions[fromUnit] && volumeConversions[fromUnit][toUnit]) {
      const converted = quantity * volumeConversions[fromUnit][toUnit];
      return converted / serving.size;
    }

    // If we don't have a conversion, assume they're compatible and return the ratio
    console.warn(`No conversion found from ${fromUnit} to ${toUnit}. Assuming direct ratio.`);
    return quantity / serving.size;
  }
}

export default new FoodService();