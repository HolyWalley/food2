// Document type constants
export const DocumentTypes = {
  FOOD: 'food',
  RECIPE: 'recipe',
  MENU: 'menu'
};

// Create a helper to generate a new food document
export function createFoodDocument(data) {
  return {
    ...data,
    type: DocumentTypes.FOOD
  };
}

// Create a helper to generate a new recipe document
export function createRecipeDocument(data) {
  return {
    ...data, 
    type: DocumentTypes.RECIPE
  };
}

// Create a helper to generate a new menu document
export function createMenuDocument(data) {
  return {
    ...data,
    type: DocumentTypes.MENU
  };
}

// Simple validation functions
export function isFoodDocument(doc) {
  return doc && doc.type === DocumentTypes.FOOD;
}

export function isRecipeDocument(doc) {
  return doc && doc.type === DocumentTypes.RECIPE;
}

export function isMenuDocument(doc) {
  return doc && doc.type === DocumentTypes.MENU;
}