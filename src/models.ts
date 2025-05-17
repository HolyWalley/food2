// This file contains runtime implementations of our data models
// to avoid TypeScript import issues in the browser

// Base types for documents
export interface BaseDocument {
  _id: string;
  _rev?: string;
  createdAt: string;
  updatedAt: string;
  type: string;
}

// Nutritional information
export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cholesterol?: number;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
}

// Serving size information
export interface ServingInfo {
  size: number;
  unit: string;
  weightInGrams?: number;  // Weight equivalent in grams (for conversion calculations)
}

// Food document
export interface FoodDocument extends BaseDocument {
  type: 'food';
  name: string;
  category: string;
  nutrients: NutritionInfo;
  serving: ServingInfo;
  allergens?: string[];
  tags?: string[];
}

// Recipe ingredient
export interface RecipeIngredient {
  foodId: string;
  quantity: number;
  unit: string;
}

// Recipe document
export interface RecipeDocument extends BaseDocument {
  type: 'recipe';
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  servings: number;
  prepTime?: number;
  cookTime?: number;
  tags?: string[];
  imageUrl?: string;
}

// Menu item
export interface MenuItem {
  type: 'food' | 'recipe';
  itemId: string;
  portions: number;
}

// Menu document
export interface MenuDocument extends BaseDocument {
  type: 'menu';
  name: string;
  description: string;
  date: string;
  items: MenuItem[];
  tags?: string[];
}

// Document type constants
export const DocumentTypes = {
  FOOD: 'food',
  RECIPE: 'recipe',
  MENU: 'menu'
};