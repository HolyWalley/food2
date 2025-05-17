/**
 * Utilities for working with Nutritionix API data
 */

// List of standard units supported by our app
export const standardUnits = [
  // Weight units
  'g', 'kg', 'oz', 'lb',
  // Volume units
  'ml', 'l', 'cup', 'tbsp', 'tsp', 
  // Count units
  'piece', 'serving',
  // Size descriptors
  'small', 'medium', 'large',
  // Common food units
  'clove', 'slice', 'can', 'bottle', 'packet', 'container'
];

// Unit categories for grouping in select
export const unitCategories = {
  weight: ['g', 'kg', 'oz', 'lb'],
  volume: ['ml', 'l', 'cup', 'tbsp', 'tsp'],
  count: ['piece', 'serving'],
  descriptive: ['small', 'medium', 'large', 'clove', 'slice', 'can', 'bottle', 'packet', 'container']
};

// Common Nutritionix unit mappings
const unitMappings: Record<string, string> = {
  // Direct mappings
  'g': 'g',
  'oz': 'oz',
  'lb': 'lb',
  'ml': 'ml',
  'l': 'l',
  'cup': 'cup',
  'tbsp': 'tbsp',
  'tsp': 'tsp',
  
  // Size descriptors
  'extra small': 'small',
  'small': 'small',
  'medium': 'medium',
  'large': 'large',
  'extra large': 'large',
  
  // Common food descriptors
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
  
  // Special cases
  'medium (2-3/4" dia)': 'medium',
  'medium (2-3/4" dia, 4 per lb)': 'medium',
  'large (3-1/4" dia)': 'large',
  'small (2-1/2" dia)': 'small',
  'jumbo': 'large',
  'stick': 'piece',
  'unit': 'piece'
};

/**
 * Maps a Nutritionix serving unit to our standard units
 * 
 * @param nutritionixUnit The unit from Nutritionix API
 * @param foodName The food name (used for context in some cases)
 * @returns The best matching standard unit
 */
export function mapNutritionixUnit(nutritionixUnit: string, foodName: string): string {
  console.log(`Mapping Nutritionix unit: "${nutritionixUnit}" for "${foodName}"`);
  
  // First try direct mapping
  if (unitMappings[nutritionixUnit.toLowerCase()]) {
    return unitMappings[nutritionixUnit.toLowerCase()];
  }
  
  // Try to find a match by analyzing parts of the unit string
  const lowerUnit = nutritionixUnit.toLowerCase();
  
  // If unit contains these words, map accordingly
  if (lowerUnit.includes('small')) return 'small';
  if (lowerUnit.includes('medium')) return 'medium';
  if (lowerUnit.includes('large')) return 'large';
  if (lowerUnit.includes('slice')) return 'slice';
  if (lowerUnit.includes('clove')) return 'clove';
  if (lowerUnit.includes('can')) return 'can';
  if (lowerUnit.includes('bottle')) return 'bottle';
  if (lowerUnit.includes('packet') || lowerUnit.includes('pack')) return 'packet';
  if (lowerUnit.includes('container') || lowerUnit.includes('box')) return 'container';
  
  // Handle special foods
  const lowerName = foodName.toLowerCase();
  if ((lowerName.includes('egg') || lowerName.includes('egg')) && lowerUnit.includes('large')) {
    return 'large';
  }
  
  // If no match, default based on context
  if (lowerUnit.includes('whole') || lowerUnit.includes('item')) {
    return 'piece';
  }
  
  // Last resort
  console.warn(`Could not map Nutritionix unit "${nutritionixUnit}" - defaulting to piece`);
  return 'piece';
}