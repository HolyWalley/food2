// Base document interface for shared properties
export interface BaseDocument {
  _id: string;
  _rev?: string;
  createdAt: string;
  updatedAt: string;
}

// Information about nutritional content
export interface NutritionInfo {
  calories: number;
  protein: number;  // grams
  carbs: number;    // grams
  fat: number;      // grams
  fiber?: number;   // grams
  sugar?: number;   // grams
  sodium?: number;  // milligrams
  cholesterol?: number; // milligrams
  vitamins?: Record<string, number>; // Optional detailed vitamin information
  minerals?: Record<string, number>; // Optional detailed mineral information
}

// Information about serving size
export interface ServingInfo {
  size: number;
  unit: string;
  weightInGrams?: number;  // Weight equivalent in grams (for conversion calculations)
}

// Food item document
export interface Food extends BaseDocument {
  type: 'food';
  name: string;
  category: string;
  nutrients: NutritionInfo;
  serving: ServingInfo;
  allergens?: string[];
  tags?: string[];
  nutritionixId?: string;  // ID from Nutritionix API for deduplication
  commonName?: string;    // Common name from Nutritionix for matching
  nixItemId?: string;     // Nutritionix item ID
  nixBrandId?: string;    // Nutritionix brand ID
  ndbNumber?: string;     // USDA database number
  altMeasures?: Record<string, unknown>[];    // Alternative measurement options
}

// Recipe ingredient
export interface RecipeIngredient {
  foodId: string;
  quantity: number;
  unit: string;
}

// Recipe document
export interface Recipe extends BaseDocument {
  type: 'recipe';
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  servings: number;
  prepTime?: number; // minutes
  cookTime?: number; // minutes
  tags?: string[];
  imageUrl?: string;
}

// Menu item (reference to a food or recipe)
export interface MenuItem {
  type: 'food' | 'recipe';
  itemId: string;
  portions: number;
}

// Menu document
export interface Menu extends BaseDocument {
  type: 'menu';
  name: string;
  description: string;
  items: MenuItem[];
  tags?: string[];
}

// Type for any document stored in the database
export type AppDocument = Food | Recipe | Menu;