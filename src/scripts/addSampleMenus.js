// This is a script to add sample menus to the database
// Run it in the browser console after the app is loaded

async function addSampleMenus() {
  // Make sure we have access to required services
  if (!window.menuService) {
    console.error('Menu service not found in window object. Add it first with: window.menuService = menuService');
    return;
  }
  
  if (!window.foodService || !window.recipeService) {
    console.error('Food or Recipe service not found. Add them first with: window.foodService = foodService; window.recipeService = recipeService');
    return;
  }
  
  // Get all foods and recipes to find their IDs
  const foods = await window.foodService.getAllFoods();
  if (!foods || foods.length === 0) {
    console.error('No foods found. Please add foods first.');
    return;
  }
  
  const recipes = await window.recipeService.getAllRecipes();
  if (!recipes || recipes.length === 0) {
    console.error('No recipes found. Please add recipes first.');
    return;
  }
  
  // Map to find foods and recipes by name (case insensitive)
  const foodMap = {};
  foods.forEach(food => {
    foodMap[food.name.toLowerCase()] = food;
  });
  
  const recipeMap = {};
  recipes.forEach(recipe => {
    recipeMap[recipe.name.toLowerCase()] = recipe;
  });
  
  // Helper functions to find IDs by name
  function getFoodIdByName(name) {
    const food = foodMap[name.toLowerCase()];
    if (!food) {
      console.warn(`Food not found: ${name}`);
      return null;
    }
    return food._id;
  }
  
  function getRecipeIdByName(name) {
    const recipe = recipeMap[name.toLowerCase()];
    if (!recipe) {
      console.warn(`Recipe not found: ${name}`);
      return null;
    }
    return recipe._id;
  }
  
  // Create sample dates (today and the next 6 days)
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]); // Format as YYYY-MM-DD
  }
  
  // Sample menus
  const sampleMenus = [
    {
      name: 'Healthy Monday',
      description: 'A nutritious start to the week with balanced meals',
      date: dates[0], // Today
      items: [
        { type: 'food', itemId: getFoodIdByName('Apple'), portions: 1 },
        { type: 'food', itemId: getFoodIdByName('Oats'), portions: 0.5 },
        { type: 'recipe', itemId: getRecipeIdByName('Vegetable Stir Fry'), portions: 1 },
        { type: 'food', itemId: getFoodIdByName('Chicken Breast'), portions: 1 }
      ].filter(i => i.itemId !== null),
      tags: ['Healthy', 'Balanced', 'High Protein']
    },
    {
      name: 'Quick & Easy Tuesday',
      description: 'Simple meals for a busy day',
      date: dates[1], // Tomorrow
      items: [
        { type: 'recipe', itemId: getRecipeIdByName('Banana Oatmeal Breakfast'), portions: 1 },
        { type: 'recipe', itemId: getRecipeIdByName('Chicken Salad'), portions: 1 },
        { type: 'food', itemId: getFoodIdByName('Brown Rice'), portions: 1 },
        { type: 'food', itemId: getFoodIdByName('Salmon'), portions: 1 }
      ].filter(i => i.itemId !== null),
      tags: ['Quick', 'Simple', 'Time-Saving']
    },
    {
      name: 'Midweek Boost',
      description: 'Nutritious meals to keep energy levels high',
      date: dates[2], // Day after tomorrow
      items: [
        { type: 'food', itemId: getFoodIdByName('Oats'), portions: 0.5 },
        { type: 'food', itemId: getFoodIdByName('Banana'), portions: 1 },
        { type: 'recipe', itemId: getRecipeIdByName('Chicken Salad'), portions: 1 },
        { type: 'food', itemId: getFoodIdByName('Salmon'), portions: 1 },
        { type: 'food', itemId: getFoodIdByName('Broccoli'), portions: 1 }
      ].filter(i => i.itemId !== null),
      tags: ['Energy', 'Nutritious', 'Midweek']
    }
  ];
  
  console.log('Adding sample menus...');
  
  // Add each menu
  for (const menu of sampleMenus) {
    try {
      if (menu.items.length === 0) {
        console.warn(`Skipping menu "${menu.name}" as it has no valid items`);
        continue;
      }
      
      console.log(`Adding menu: ${menu.name}`);
      await window.menuService.createMenu(menu);
      console.log(`✓ Added menu: ${menu.name}`);
    } catch (error) {
      console.error(`Error adding menu "${menu.name}":`, error);
    }
  }
  
  console.log('Sample menus have been added!');
}

// Usage instructions:
// 1. Open your app in the browser
// 2. Open the browser console
// 3. Make sure you've added sample foods and recipes first
// 4. Copy paste the following:
//    window.menuService = menuService;
//    window.foodService = foodService;
//    window.recipeService = recipeService;
// 5. Then paste the entire function above and call it:
//    addSampleMenus();