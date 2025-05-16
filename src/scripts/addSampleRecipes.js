// This is a script to add sample recipes to the database
// Run it in the browser console after the app is loaded

async function addSampleRecipes() {
  // Make sure we have access to the recipeService
  if (!window.recipeService) {
    console.error('Recipe service not found in window object. Add it first with: window.recipeService = recipeService');
    return;
  }
  
  // Get all foods to find their IDs
  const foods = await window.foodService.getAllFoods();
  if (!foods || foods.length === 0) {
    console.error('No foods found. Please add foods first.');
    return;
  }
  
  // Map to find foods by name (case insensitive)
  const foodMap = {};
  foods.forEach(food => {
    foodMap[food.name.toLowerCase()] = food;
  });
  
  // Helper function to find food ID by name
  function getFoodIdByName(name) {
    const food = foodMap[name.toLowerCase()];
    if (!food) {
      console.warn(`Food not found: ${name}`);
      return null;
    }
    return food._id;
  }
  
  // Sample recipes
  const sampleRecipes = [
    {
      name: 'Vegetable Stir Fry',
      description: 'A quick and healthy vegetable stir fry with a savory sauce.',
      servings: 2,
      prepTime: 15,
      cookTime: 10,
      ingredients: [
        { foodId: getFoodIdByName('Broccoli'), quantity: 1, unit: 'cup' },
        { foodId: getFoodIdByName('Bell Pepper'), quantity: 1, unit: 'medium' },
        { foodId: getFoodIdByName('Carrot'), quantity: 1, unit: 'medium' },
        { foodId: getFoodIdByName('Olive Oil'), quantity: 1, unit: 'tbsp' },
        { foodId: getFoodIdByName('Soy Sauce'), quantity: 2, unit: 'tbsp' },
        { foodId: getFoodIdByName('Ginger'), quantity: 1, unit: 'tsp' },
        { foodId: getFoodIdByName('Garlic'), quantity: 2, unit: 'cloves' }
      ].filter(i => i.foodId !== null),
      instructions: [
        'Wash and chop all vegetables into bite-sized pieces.',
        'Heat olive oil in a wok or large skillet over medium-high heat.',
        'Add ginger and garlic, stir for 30 seconds until fragrant.',
        'Add vegetables and stir fry for 5-7 minutes until crisp-tender.',
        'Add soy sauce and continue cooking for 1 minute.',
        'Serve hot as a side dish or over rice.'
      ],
      tags: ['Vegetarian', 'Quick', 'Healthy', 'Asian']
    },
    {
      name: 'Banana Oatmeal Breakfast',
      description: 'A hearty and nutritious breakfast to start your day right.',
      servings: 1,
      prepTime: 5,
      cookTime: 5,
      ingredients: [
        { foodId: getFoodIdByName('Oats'), quantity: 0.5, unit: 'cup' },
        { foodId: getFoodIdByName('Banana'), quantity: 1, unit: 'medium' },
        { foodId: getFoodIdByName('Milk'), quantity: 1, unit: 'cup' },
        { foodId: getFoodIdByName('Honey'), quantity: 1, unit: 'tbsp' },
        { foodId: getFoodIdByName('Cinnamon'), quantity: 0.25, unit: 'tsp' }
      ].filter(i => i.foodId !== null),
      instructions: [
        'Combine oats and milk in a microwave-safe bowl.',
        'Microwave on high for 2 minutes, stir, then microwave for another 1 minute.',
        'Slice the banana and add to the cooked oatmeal.',
        'Stir in honey and sprinkle with cinnamon.',
        'Let cool slightly before enjoying.'
      ],
      tags: ['Breakfast', 'Quick', 'Vegetarian']
    },
    {
      name: 'Chicken Salad',
      description: 'A refreshing and protein-packed salad perfect for lunch or a light dinner.',
      servings: 2,
      prepTime: 15,
      cookTime: 0,
      ingredients: [
        { foodId: getFoodIdByName('Chicken Breast'), quantity: 200, unit: 'g' },
        { foodId: getFoodIdByName('Lettuce'), quantity: 2, unit: 'cup' },
        { foodId: getFoodIdByName('Tomato'), quantity: 1, unit: 'medium' },
        { foodId: getFoodIdByName('Cucumber'), quantity: 0.5, unit: 'medium' },
        { foodId: getFoodIdByName('Olive Oil'), quantity: 1, unit: 'tbsp' },
        { foodId: getFoodIdByName('Lemon Juice'), quantity: 2, unit: 'tsp' },
        { foodId: getFoodIdByName('Salt'), quantity: 0.25, unit: 'tsp' },
        { foodId: getFoodIdByName('Black Pepper'), quantity: 0.25, unit: 'tsp' }
      ].filter(i => i.foodId !== null),
      instructions: [
        'Slice cooked chicken breast into strips or cubes.',
        'Wash and tear lettuce into bite-sized pieces.',
        'Dice tomato and cucumber.',
        'Combine all vegetables in a large bowl.',
        'Add chicken on top.',
        'In a small bowl, whisk together olive oil, lemon juice, salt and pepper.',
        'Pour dressing over salad and toss gently to combine.',
        'Serve immediately.'
      ],
      tags: ['Lunch', 'High Protein', 'No Cook', 'Keto']
    }
  ];
  
  console.log('Adding sample recipes...');
  
  // Add each recipe
  for (const recipe of sampleRecipes) {
    try {
      if (recipe.ingredients.length === 0) {
        console.warn(`Skipping recipe "${recipe.name}" as it has no valid ingredients`);
        continue;
      }
      
      console.log(`Adding recipe: ${recipe.name}`);
      await window.recipeService.createRecipe(recipe);
      console.log(`✓ Added recipe: ${recipe.name}`);
    } catch (error) {
      console.error(`Error adding recipe "${recipe.name}":`, error);
    }
  }
  
  console.log('Sample recipes have been added!');
}

// Usage instructions:
// 1. Open your app in the browser
// 2. Open the browser console
// 3. Make sure you've added sample foods first
// 4. Copy paste the following:
//    window.recipeService = recipeService;
//    window.foodService = foodService;
// 5. Then paste the entire function above and call it:
//    addSampleRecipes();