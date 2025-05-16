// This is a script to add sample foods to the database
// Run it in the browser console after the app is loaded

async function addSampleFoods() {
  // Make sure we have access to the foodService
  if (!window.foodService) {
    console.error('Food service not found in window object. Add it first with: window.foodService = foodService');
    return;
  }
  
  // Sample foods
  const sampleFoods = [
    {
      name: 'Chicken Breast',
      category: 'Proteins',
      nutrients: {
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        sodium: 74,
        cholesterol: 85
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Meat', 'High Protein', 'Low Carb']
    },
    {
      name: 'Broccoli',
      category: 'Vegetables',
      nutrients: {
        calories: 34,
        protein: 2.8,
        carbs: 6.6,
        fat: 0.4,
        fiber: 2.6,
        sodium: 33
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Vegetable', 'Low Calorie', 'High Fiber']
    },
    {
      name: 'Brown Rice',
      category: 'Grains',
      nutrients: {
        calories: 112,
        protein: 2.6,
        carbs: 23.5,
        fat: 0.9,
        fiber: 1.8,
        sodium: 5
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Grain', 'Whole Grain', 'Complex Carbs']
    },
    {
      name: 'Salmon',
      category: 'Proteins',
      nutrients: {
        calories: 206,
        protein: 22.1,
        carbs: 0,
        fat: 13.4,
        sodium: 58,
        cholesterol: 60
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Fish', 'Omega-3', 'Seafood']
    },
    {
      name: 'Apple',
      category: 'Fruits',
      nutrients: {
        calories: 52,
        protein: 0.3,
        carbs: 13.8,
        fat: 0.2,
        fiber: 2.4,
        sugar: 10.4
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Fruit', 'Sweet', 'Snack']
    },
    {
      name: 'Olive Oil',
      category: 'Fats and Oils',
      nutrients: {
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100
      },
      serving: {
        size: 15,
        unit: 'ml'
      },
      tags: ['Oil', 'Healthy Fat', 'Cooking']
    },
    {
      name: 'Soy Sauce',
      category: 'Condiments',
      nutrients: {
        calories: 53,
        protein: 8.1,
        carbs: 4.9,
        fat: 0,
        sodium: 5493
      },
      serving: {
        size: 15,
        unit: 'ml'
      },
      tags: ['Condiment', 'Asian', 'Salty']
    },
    {
      name: 'Banana',
      category: 'Fruits',
      nutrients: {
        calories: 89,
        protein: 1.1,
        carbs: 22.8,
        fat: 0.3,
        fiber: 2.6,
        sugar: 12.2,
        potassium: 358
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Fruit', 'Sweet', 'Snack']
    },
    {
      name: 'Oats',
      category: 'Grains',
      nutrients: {
        calories: 389,
        protein: 16.9,
        carbs: 66.3,
        fat: 6.9,
        fiber: 10.6,
        sugar: 0
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Grain', 'Breakfast', 'High Fiber']
    },
    {
      name: 'Milk',
      category: 'Dairy',
      nutrients: {
        calories: 42,
        protein: 3.4,
        carbs: 5,
        fat: 1,
        sugar: 5,
        calcium: 125
      },
      serving: {
        size: 100,
        unit: 'ml'
      },
      tags: ['Dairy', 'Drink']
    },
    {
      name: 'Bell Pepper',
      category: 'Vegetables',
      nutrients: {
        calories: 31,
        protein: 1,
        carbs: 6,
        fat: 0.3,
        fiber: 2.1,
        vitamin_c: 128
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Vegetable', 'Low Calorie']
    },
    {
      name: 'Carrot',
      category: 'Vegetables',
      nutrients: {
        calories: 41,
        protein: 0.9,
        carbs: 9.6,
        fat: 0.2,
        fiber: 2.8,
        sugar: 4.7
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Vegetable', 'Root']
    },
    {
      name: 'Honey',
      category: 'Condiments',
      nutrients: {
        calories: 304,
        protein: 0.3,
        carbs: 82.4,
        fat: 0,
        sugar: 82.1
      },
      serving: {
        size: 15,
        unit: 'ml'
      },
      tags: ['Sweetener', 'Natural']
    },
    {
      name: 'Cinnamon',
      category: 'Condiments',
      nutrients: {
        calories: 247,
        protein: 4,
        carbs: 80.6,
        fat: 1.2,
        fiber: 53.1
      },
      serving: {
        size: 5,
        unit: 'g'
      },
      tags: ['Spice', 'Sweet']
    },
    {
      name: 'Ginger',
      category: 'Condiments',
      nutrients: {
        calories: 80,
        protein: 1.8,
        carbs: 17.8,
        fat: 0.8,
        fiber: 2
      },
      serving: {
        size: 10,
        unit: 'g'
      },
      tags: ['Spice', 'Asian']
    },
    {
      name: 'Garlic',
      category: 'Condiments',
      nutrients: {
        calories: 149,
        protein: 6.4,
        carbs: 33.1,
        fat: 0.5,
        fiber: 2.1
      },
      serving: {
        size: 10,
        unit: 'g'
      },
      tags: ['Spice', 'Aromatic']
    },
    {
      name: 'Lettuce',
      category: 'Vegetables',
      nutrients: {
        calories: 15,
        protein: 1.4,
        carbs: 2.9,
        fat: 0.2,
        fiber: 1.3
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Vegetable', 'Salad', 'Low Calorie']
    },
    {
      name: 'Tomato',
      category: 'Vegetables',
      nutrients: {
        calories: 18,
        protein: 0.9,
        carbs: 3.9,
        fat: 0.2,
        fiber: 1.2,
        sugar: 2.6
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Vegetable', 'Salad', 'Low Calorie']
    },
    {
      name: 'Cucumber',
      category: 'Vegetables',
      nutrients: {
        calories: 15,
        protein: 0.7,
        carbs: 3.6,
        fat: 0.1,
        fiber: 0.5
      },
      serving: {
        size: 100,
        unit: 'g'
      },
      tags: ['Vegetable', 'Salad', 'Low Calorie']
    },
    {
      name: 'Lemon Juice',
      category: 'Condiments',
      nutrients: {
        calories: 22,
        protein: 0.4,
        carbs: 6.9,
        fat: 0.2,
        sugar: 2.5,
        vitamin_c: 39
      },
      serving: {
        size: 15,
        unit: 'ml'
      },
      tags: ['Condiment', 'Sour', 'Citrus']
    },
    {
      name: 'Salt',
      category: 'Condiments',
      nutrients: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        sodium: 38758
      },
      serving: {
        size: 5,
        unit: 'g'
      },
      tags: ['Seasoning', 'Mineral']
    },
    {
      name: 'Black Pepper',
      category: 'Condiments',
      nutrients: {
        calories: 255,
        protein: 10.4,
        carbs: 63.9,
        fat: 3.3,
        fiber: 25.3
      },
      serving: {
        size: 5,
        unit: 'g'
      },
      tags: ['Spice', 'Seasoning']
    }
  ];
  
  console.log('Adding sample foods...');
  
  // Add each food
  for (const food of sampleFoods) {
    try {
      console.log(`Adding food: ${food.name}`);
      await window.foodService.createFood(food);
      console.log(`✓ Added food: ${food.name}`);
    } catch (error) {
      console.error(`Error adding food "${food.name}":`, error);
    }
  }
  
  console.log('Sample foods have been added!');
}

// Usage instructions:
// 1. Open your app in the browser
// 2. Open the browser console
// 3. Copy paste the following:
//    window.foodService = foodService;
// 4. Then paste the entire function above and call it:
//    addSampleFoods();