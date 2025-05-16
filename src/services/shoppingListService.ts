import foodService from './foodService';
import recipeService from './recipeService';
import menuService from './menuService';
import { type Menu, type Food, type Recipe, type RecipeIngredient } from '../types';

// Represents an item in the shopping list with quantity, unit, and food name
export interface ShoppingListItem {
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

export class ShoppingListService {
  /**
   * Generate a shopping list from a menu
   */
  async generateShoppingList(menu: Menu): Promise<ShoppingListItem[]> {
    // Initialize an empty shopping list
    const shoppingList: Record<string, ShoppingListItem> = {};
    
    console.log(`Generating shopping list for menu: ${menu.name}`);
    
    // Process each menu item
    for (const menuItem of menu.items) {
      console.log(`Processing menu item: ${menuItem.itemId} (${menuItem.type})`);
      
      try {
        if (menuItem.type === 'food') {
          // If the item is a food, add it directly to the shopping list
          await this.addFoodToShoppingList(
            shoppingList, 
            menuItem.itemId, 
            menuItem.portions
          );
        } else if (menuItem.type === 'recipe') {
          // If the item is a recipe, process all its ingredients
          await this.addRecipeToShoppingList(
            shoppingList, 
            menuItem.itemId, 
            menuItem.portions
          );
        }
      } catch (error) {
        console.error(`Error processing menu item ${menuItem.itemId}:`, error);
      }
    }
    
    // Convert the record to an array and sort by category and name
    return Object.values(shoppingList).sort((a, b) => {
      // First sort by category
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
      
      // Then sort by name
      return a.name.localeCompare(b.name);
    });
  }
  
  /**
   * Add a food item to the shopping list
   */
  private async addFoodToShoppingList(
    shoppingList: Record<string, ShoppingListItem>,
    foodId: string,
    portions: number
  ): Promise<void> {
    try {
      // Get the food item
      const food = await foodService.getFoodById(foodId);
      console.log(`Adding food to shopping list: ${food.name}`);
      
      // Calculate the total quantity needed
      const quantity = food.serving.size * portions;
      
      // Create or update the shopping list item
      this.updateShoppingListItem(shoppingList, foodId, food.name, quantity, food.serving.unit, food.category);
    } catch (error) {
      console.error(`Error adding food ${foodId} to shopping list:`, error);
    }
  }
  
  /**
   * Add a recipe's ingredients to the shopping list
   */
  private async addRecipeToShoppingList(
    shoppingList: Record<string, ShoppingListItem>,
    recipeId: string,
    portions: number
  ): Promise<void> {
    try {
      // Get the recipe
      const recipe = await recipeService.getRecipeById(recipeId);
      console.log(`Adding recipe ingredients to shopping list: ${recipe.name}`);
      
      // Calculate the portion multiplier
      const portionMultiplier = portions / recipe.servings;
      
      // Process each ingredient
      for (const ingredient of recipe.ingredients) {
        try {
          // Get the ingredient food
          const food = await foodService.getFoodById(ingredient.foodId);
          
          // Calculate the quantity
          const convertedQuantity = await this.convertQuantity(
            ingredient, 
            food,
            portionMultiplier
          );
          
          // Update the shopping list
          this.updateShoppingListItem(
            shoppingList,
            food._id,
            food.name,
            convertedQuantity.quantity,
            convertedQuantity.unit,
            food.category
          );
        } catch (error) {
          console.error(`Error processing ingredient ${ingredient.foodId}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error adding recipe ${recipeId} to shopping list:`, error);
    }
  }
  
  /**
   * Convert recipe ingredient quantity to standardized units, multiplied by portions
   */
  private async convertQuantity(
    ingredient: RecipeIngredient,
    food: Food,
    portionMultiplier: number
  ): Promise<{ quantity: number; unit: string }> {
    // Calculate the adjusted quantity based on portion multiplier
    const adjustedQuantity = ingredient.quantity * portionMultiplier;
    
    // If the units are the same, no conversion needed
    if (ingredient.unit.toLowerCase() === food.serving.unit.toLowerCase()) {
      return {
        quantity: adjustedQuantity,
        unit: food.serving.unit
      };
    }
    
    // Use the food service to get the nutrition with the ingredient quantity and unit
    // This will apply the proper unit conversion
    const nutrition = foodService.calculateNutrition(
      food,
      adjustedQuantity,
      ingredient.unit
    );
    
    // The conversion factor represents how many servings this amount equals
    const conversionFactor = nutrition.calories / food.nutrients.calories;
    
    // Calculate the equivalent quantity in the food's serving unit
    const convertedQuantity = food.serving.size * conversionFactor;
    
    // Return the converted quantity and unit
    return {
      quantity: parseFloat(convertedQuantity.toFixed(2)), // Round to 2 decimal places
      unit: food.serving.unit
    };
  }
  
  /**
   * Update or add an item in the shopping list
   */
  private updateShoppingListItem(
    shoppingList: Record<string, ShoppingListItem>,
    foodId: string,
    name: string,
    quantity: number,
    unit: string,
    category: string
  ): void {
    // Create a unique key for the food and unit combination
    const key = `${foodId}:${unit}`;
    
    if (shoppingList[key]) {
      // If the item already exists, add to its quantity
      shoppingList[key].quantity += quantity;
      // Round to 2 decimal places
      shoppingList[key].quantity = parseFloat(shoppingList[key].quantity.toFixed(2));
    } else {
      // Otherwise, create a new entry
      shoppingList[key] = {
        foodId,
        name,
        quantity: parseFloat(quantity.toFixed(2)),
        unit,
        category
      };
    }
  }
  
  /**
   * Consolidate similar items in the shopping list
   * This attempts to combine items with different units where possible
   */
  consolidateShoppingList(shoppingList: ShoppingListItem[]): ShoppingListItem[] {
    // Group items by food ID
    const groupedItems: Record<string, ShoppingListItem[]> = {};
    
    // Group items by food ID
    for (const item of shoppingList) {
      if (!groupedItems[item.foodId]) {
        groupedItems[item.foodId] = [];
      }
      groupedItems[item.foodId].push(item);
    }
    
    // Attempt to consolidate each group
    const consolidatedList: ShoppingListItem[] = [];
    
    for (const foodId in groupedItems) {
      const items = groupedItems[foodId];
      
      // If there's only one item, no consolidation needed
      if (items.length === 1) {
        consolidatedList.push(items[0]);
        continue;
      }
      
      // Attempt to convert all items to the same unit (using the first item's unit)
      const primaryItem = items[0];
      let totalQuantity = primaryItem.quantity;
      
      // This is a simplified approach, you may want to implement more sophisticated unit conversion
      for (let i = 1; i < items.length; i++) {
        // Skip items with different units for now
        if (items[i].unit !== primaryItem.unit) {
          consolidatedList.push(items[i]);
          continue;
        }
        
        // Add the quantity if the units match
        totalQuantity += items[i].quantity;
      }
      
      // Create a consolidated item
      consolidatedList.push({
        ...primaryItem,
        quantity: parseFloat(totalQuantity.toFixed(2))
      });
    }
    
    return consolidatedList;
  }
  
  /**
   * Format the quantity and unit for display
   */
  formatQuantityAndUnit(quantity: number, unit: string): string {
    // Round to 2 decimal places
    const formattedQuantity = parseFloat(quantity.toFixed(2));
    
    // Remove trailing zeros if it's a whole number
    const displayQuantity = formattedQuantity % 1 === 0 
      ? Math.round(formattedQuantity) 
      : formattedQuantity;
    
    return `${displayQuantity} ${unit}`;
  }
}

export default new ShoppingListService();