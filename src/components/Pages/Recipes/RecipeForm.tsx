import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import recipeService from '../../../services/recipeService';
import foodService from '../../../services/foodService';
import { Select, PaginatedSelect } from '../../../components/UI';
import { unitCategories, standardUnits } from '../../../utils/nutritionixUtils';
import type { Recipe, RecipeIngredient, Food } from '../../../types';
import { v4 as uuidv4 } from 'uuid';

// Component to handle food name display, including individual fetching if needed
const IngredientFoodName = ({ foodId, foodFromList }: { foodId: string, foodFromList?: Food }) => {
  // Only query if the food wasn't found in the global list
  const { data: food, isLoading } = useQuery({
    queryKey: ['food', foodId],
    queryFn: () => foodService.getFoodById(foodId),
    enabled: !!foodId && !foodFromList
  });

  // Use the food from list if available, otherwise use individually fetched food
  const foodToDisplay = foodFromList || food;

  return (
    <>
      <span className="ml-1 dark:text-gray-300">
        {foodToDisplay ? 
          `of ${foodToDisplay.name}` : 
          (isLoading ? 
            <span className="text-gray-400 italic">Loading food...</span> : 
            <span className="text-red-400 italic">Food not found</span>)
        }
      </span>
      {foodToDisplay?.serving?.weightInGrams && foodToDisplay?.serving?.unit !== 'g' && (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          ({foodToDisplay.serving.unit}: {foodToDisplay.serving.weightInGrams}g)
        </span>
      )}
    </>
  );
};

/**
 * Find the best matching food from existing foods based on name similarity and nutrient profile.
 * Returns the best match if similarity is above threshold, otherwise null.
 */
function findBestFoodMatch(existingFoods: Food[], newFood: any) {
  // Lower threshold means easier matching
  const SIMILARITY_THRESHOLD = 0.7;  // 70% similarity required for a match
  const NUTRIENT_MATCH_BOOST = 0.2;  // Boost score by 20% if nutrients match closely
  
  if (!existingFoods || existingFoods.length === 0) {
    return null;
  }
  
  let bestMatch: Food | null = null;
  let highestScore = 0;
  
  for (const food of existingFoods) {
    // 1. Calculate name similarity (case insensitive)
    const existingName = food.name.toLowerCase();
    const newName = newFood.name.toLowerCase();
    
    // Check for exact match on nutritionixId first if available
    if (food.nutritionixId && newFood.nutritionixId && 
        food.nutritionixId.toLowerCase() === newFood.nutritionixId.toLowerCase()) {
      // Direct match on nutritionixId is a perfect match
      return food; // Immediate return with a perfect match
    }
    
    // Check commonName if available (fuzzy match)
    if (food.commonName && newFood.commonName && 
        food.commonName.toLowerCase() === newFood.commonName.toLowerCase()) {
      // Direct match on commonName is almost a perfect match
      return food; // Immediate return with a very good match
    }
    
    // Define stopwords to ignore in food name comparison
    const stopwords = new Set(['and', 'or', 'the', 'a', 'an', 'of', 'in', 'with', 'without',
                               'fresh', 'frozen', 'raw', 'cooked', 'sliced', 'chopped', 'diced',
                               'minced', 'grated', 'shredded', 'whole', 'cut', 'pieces']);
                               
    // Normalize and tokenize names, removing stopwords
    const normalizeAndTokenize = (name: string): string[] => {
      return name.toLowerCase()
        .replace(/[(),-\/]/g, ' ') // Replace punctuation with spaces
        .split(/\s+/)
        .filter(word => word.length > 1 && !stopwords.has(word));
    };
    
    // Get normalized words for both food names
    const existingWords = new Set(normalizeAndTokenize(existingName));
    const newWords = new Set(normalizeAndTokenize(newName));
    
    // Check for direct name match after normalization
    if (existingWords.size === newWords.size && 
        [...existingWords].every(word => newWords.has(word))) {
      return food; // Direct match after normalization
    }
    
    // Calculate intersection and union for Jaccard similarity
    const intersection = new Set([...existingWords].filter(word => newWords.has(word)));
    const union = new Set([...existingWords, ...newWords]);
    
    // Name similarity score (Jaccard index)
    let similarityScore = intersection.size / union.size;
    
    // 2. Check if nutrient profiles are similar (within 10% of each other)
    const nutrientsSimilar = (
      isNutrientSimilar(food.nutrients.calories, newFood.nutrients.calories, 0.1) &&
      isNutrientSimilar(food.nutrients.protein, newFood.nutrients.protein, 0.1) &&
      isNutrientSimilar(food.nutrients.carbs, newFood.nutrients.carbs, 0.1) &&
      isNutrientSimilar(food.nutrients.fat, newFood.nutrients.fat, 0.1)
    );
    
    // Boost score if nutrients are similar
    if (nutrientsSimilar) {
      similarityScore += NUTRIENT_MATCH_BOOST;
    }
    
    // 3. Check if category matches and boost score
    if (food.category.toLowerCase() === newFood.category.toLowerCase()) {
      similarityScore += 0.1; // Boost by 10% for matching category
    }
    
    // Update best match if this is the highest score so far
    if (similarityScore > highestScore && similarityScore >= SIMILARITY_THRESHOLD) {
      highestScore = similarityScore;
      bestMatch = food;
    }
  }
  
  return bestMatch;
}

/**
 * Check if two nutrient values are similar within the given tolerance
 */
function isNutrientSimilar(value1: number, value2: number, tolerance: number): boolean {
  if (value1 === 0 && value2 === 0) {
    return true;
  }
  
  const max = Math.max(value1, value2);
  const min = Math.min(value1, value2);
  
  return (max - min) / max <= tolerance;
}

const RecipeForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState<number | undefined>(undefined);
  const [cookTime, setCookTime] = useState<number | undefined>(undefined);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>(['']);

  // For debugging
  useEffect(() => {
    console.log('Ingredients state updated:', ingredients);
  }, [ingredients]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  // AI recipe generation state
  const [isGenerating, setIsGenerating] = useState(false);

  // New ingredient state
  const [newIngredient, setNewIngredient] = useState<RecipeIngredient>({
    foodId: '',
    quantity: 1,
    unit: 'g'
  });

  // Fetch recipe data if in edit mode
  const { data: recipeData, isLoading: recipeLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => (id ? recipeService.getRecipeById(id) : null),
    enabled: isEditMode
  });

  // Fetch all foods for the ingredient dropdown - used for displaying existing ingredients
  const { data: foods, isLoading: foodsLoading } = useQuery({
    queryKey: ['foods'],
    queryFn: foodService.getAllFoods
  });
  
  // Fetch specific foods for ingredients if they aren't in the main foods list
  useEffect(() => {
    if (ingredients.length > 0 && foods) {
      const missingFoodIds = ingredients
        .map(ingredient => ingredient.foodId)
        .filter(foodId => !foods.some(food => food._id === foodId));
      
      // Fetch each missing food
      missingFoodIds.forEach(foodId => {
        queryClient.prefetchQuery({
          queryKey: ['food', foodId],
          queryFn: () => foodService.getFoodById(foodId)
        });
      });
    }
  }, [ingredients, foods, queryClient]);

  // Set form data when recipe data is loaded
  useEffect(() => {
    if (recipeData) {
      setName(recipeData.name);
      setDescription(recipeData.description);
      setServings(recipeData.servings);
      setPrepTime(recipeData.prepTime);
      setCookTime(recipeData.cookTime);
      setIngredients(recipeData.ingredients);
      setInstructions(recipeData.instructions.length > 0 ? recipeData.instructions : ['']);
      setTags(recipeData.tags || []);
    }
  }, [recipeData]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (recipeData: Omit<Recipe, '_id' | 'type' | 'createdAt' | 'updatedAt'>) =>
      recipeService.createRecipe(recipeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      navigate('/recipes');
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create recipe');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (recipeData: Recipe) => recipeService.updateRecipe(recipeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      navigate('/recipes');
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update recipe');
    }
  });

  // AI recipe generation mutation
  const generateRecipeMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await fetch(`/api/recipe/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate recipe');
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // Process the generated recipe
      await processGeneratedRecipe(data);
    },
    // Retry the mutation if it fails
    retry: 1,
    onError: (error: any) => {
      setError(error.message || 'Failed to generate recipe');
      setIsGenerating(false);
    }
  });

  // Add an ingredient to the recipe
  const addIngredient = () => {
    if (!newIngredient.foodId) {
      setError('Please select a food for the ingredient');
      return;
    }

    console.log('Adding ingredient:', newIngredient);
    const updatedIngredients = [...ingredients, { ...newIngredient }];
    console.log('Updated ingredients:', updatedIngredients);
    setIngredients(updatedIngredients);

    // Reset new ingredient form
    setNewIngredient({
      foodId: '',
      quantity: 1,
      unit: 'g'
    });
  };

  // Remove an ingredient
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Add an instruction step
  const addInstructionStep = () => {
    setInstructions([...instructions, '']);
  };

  // Update an instruction step
  const updateInstructionStep = (index: number, value: string) => {
    const updatedInstructions = [...instructions];
    updatedInstructions[index] = value;
    setInstructions(updatedInstructions);
  };

  // Remove an instruction step
  const removeInstructionStep = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Process the AI-generated recipe and populate the form
  const processGeneratedRecipe = async (data: any) => {
    try {
      console.log('Processing generated recipe:', data);

      // Set basic recipe details
      setName(data.name);
      setDescription(data.description);
      setServings(data.servings);
      setPrepTime(data.prepTime);
      setCookTime(data.cookTime);

      // Set instructions
      setInstructions(data.instructions);

      // Set tags if they exist
      if (data.tags && data.tags.length > 0) {
        setTags(data.tags);
      }

      // Handle ingredients
      if (data.processedIngredients && data.processedIngredients.length > 0) {
        // Process ingredients in parallel for better performance
        const ingredientPromises = data.processedIngredients.map(async (processedIngredient: any) => {
          try {
            // Check if the food already exists in our database using a more robust matching algorithm
            const existingFoods = await foodService.getAllFoods();
            let foodId = '';
            let foodDetails = null;
            
            // Check if we have a Nutritionix ID match (nix_item_id has priority)
            let nutritionixIdMatch = null;
            if (processedIngredient.food.nixItemId) {
              nutritionixIdMatch = existingFoods.find(
                f => f.nixItemId === processedIngredient.food.nixItemId
              );
            }
            
            // Find the best matching food using a similarity score
            const foodMatch = findBestFoodMatch(existingFoods, processedIngredient.food);
            
            // Use either the nutritionix match or best name match
            if (nutritionixIdMatch) {
              foodId = nutritionixIdMatch._id;
              foodDetails = nutritionixIdMatch;
              console.log(`Using existing food via Nutritionix ID: ${nutritionixIdMatch.name} (${foodId})`);
            } else if (foodMatch) {
              foodId = foodMatch._id;
              foodDetails = foodMatch;
              console.log(`Using existing food: ${foodMatch.name} (${foodId}) - matched with ${processedIngredient.food.name}`);
            } else {
              // Create a new food item
              console.log(`Creating new food: ${processedIngredient.food.name}`);
              
              const newFood = await foodService.createFood({
                name: processedIngredient.food.name,
                category: processedIngredient.food.category,
                nutrients: processedIngredient.food.nutrients,
                serving: processedIngredient.food.serving,
                tags: [processedIngredient.food.category],
                nutritionixId: processedIngredient.food.nutritionixId,
                commonName: processedIngredient.food.commonName,
                nixItemId: processedIngredient.food.nixItemId,
                nixBrandId: processedIngredient.food.nixBrandId,
                ndbNumber: processedIngredient.food.ndbNumber,
                altMeasures: processedIngredient.food.altMeasures
              });
              
              foodId = newFood._id;
              foodDetails = newFood;
              console.log(`Created new food with ID: ${foodId}`);
              
              // Add the new food to the query cache so it's immediately available
              queryClient.setQueryData(['food', foodId], foodDetails);
            }
            
            // Return the ingredient with the correct food ID
            return {
              foodId,
              quantity: processedIngredient.quantity,
              unit: processedIngredient.unit
            };
          } catch (error) {
            console.error(`Error processing ingredient ${processedIngredient.food.name}:`, error);
            return null;
          }
        });
        
        // Wait for all ingredient processing to complete
        const processedIngredients = await Promise.all(ingredientPromises);
        
        // Filter out any null values (errors)
        const validIngredients = processedIngredients.filter(ingredient => ingredient !== null) as RecipeIngredient[];
        
        console.log('Setting ingredients:', validIngredients);
        setIngredients(validIngredients);
        
        // Invalidate the foods query to ensure the list gets refreshed
        queryClient.invalidateQueries({ queryKey: ['foods'] });
      }

      setIsGenerating(false);
    } catch (error) {
      console.error('Error processing generated recipe:', error);
      setError('Failed to process generated recipe');
      setIsGenerating(false);
    }
  };

  // Handle AI recipe generation
  const handleGenerateRecipe = () => {
    // Use the recipe name as the prompt
    if (!name || name.trim() === '') {
      setError('Please enter a recipe name or description to generate from');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    // Store the current name to use as a prompt
    const prompt = name;
    
    // Call the API with the name as the prompt
    generateRecipeMutation.mutate(prompt);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Debug state
    console.log('Form submission - current state:', {
      name,
      description,
      servings,
      ingredients: ingredients?.length || 0, // Just log the count to reduce console noise
      instructions: instructions?.length || 0,
      tags: tags?.length || 0
    });

    // Form validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (instructions.some(step => !step.trim())) {
      setError('All instruction steps must have content');
      return;
    }

    console.log('Validating ingredients:', ingredients);
    console.log('Ingredients length:', ingredients.length);

    if (!ingredients || ingredients.length === 0) {
      setError('At least one ingredient is required');
      return;
    }

    if (servings <= 0) {
      setError('Servings must be greater than zero');
      return;
    }

    // Validate that all ingredients exist
    try {
      const validation = await recipeService.validateIngredients(ingredients);
      if (!validation.valid) {
        setError(`Some ingredients are missing: ${validation.missingIngredients.join(', ')}`);
        return;
      }
    } catch (error) {
      console.error('Ingredient validation error:', error);
      setError('Failed to validate ingredients');
      return;
    }

    // Create or update recipe
    if (isEditMode && recipeData) {
      // Update existing recipe
      const updatedRecipe: Recipe = {
        ...recipeData,
        name,
        description,
        servings,
        ingredients,
        instructions: instructions.filter(step => step.trim()),
        prepTime,
        cookTime,
        tags: tags.length > 0 ? tags : undefined,
        updatedAt: new Date().toISOString()
      };
      updateMutation.mutate(updatedRecipe);
    } else {
      // Create new recipe
      const newRecipe = {
        name,
        description,
        servings,
        ingredients,
        instructions: instructions.filter(step => step.trim()),
        prepTime,
        cookTime,
        tags: tags.length > 0 ? tags : undefined
      };
      createMutation.mutate(newRecipe);
    }
  };

  // Loading state
  if (isEditMode && recipeLoading) {
    return (
      <div className="card animate-pulse p-8 dark:bg-gray-800">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-4"></div>
      </div>
    );
  }

  return (
    <div className="card max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-gray-200">
        {isEditMode ? 'Edit Recipe' : 'Add New Recipe'}
      </h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Basic Information</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="name" className="form-label dark:text-gray-300">Recipe Name</label>
                <div className="flex">
                  <input
                    id="name"
                    type="text"
                    className="form-input flex-grow"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pasta Primavera"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRecipe}
                    className="ml-2 flex items-center justify-center bg-primary-600 text-white py-2 px-3 rounded hover:bg-primary-700 transition-colors"
                    title="Generate recipe with AI using this name as prompt"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span className="material-symbols-outlined">auto_awesome</span>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="description" className="form-label dark:text-gray-300">Description</label>
                <textarea
                  id="description"
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of the recipe"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Recipe Details */}
          <div>
            <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Recipe Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="servings" className="form-label dark:text-gray-300">Servings</label>
                <input
                  id="servings"
                  type="number"
                  className="form-input"
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value))}
                  min="1"
                  required
                />
              </div>
              <div>
                <label htmlFor="prepTime" className="form-label dark:text-gray-300">Prep Time (minutes)</label>
                <input
                  id="prepTime"
                  type="number"
                  className="form-input"
                  value={prepTime === undefined ? '' : prepTime}
                  onChange={(e) => setPrepTime(e.target.value ? parseInt(e.target.value) : undefined)}
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="cookTime" className="form-label dark:text-gray-300">Cook Time (minutes)</label>
                <input
                  id="cookTime"
                  type="number"
                  className="form-input"
                  value={cookTime === undefined ? '' : cookTime}
                  onChange={(e) => setCookTime(e.target.value ? parseInt(e.target.value) : undefined)}
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Ingredients</h2>

            {/* Current ingredients */}
            {ingredients.length > 0 && (
              <div className="mb-4">
                <h3 className="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Current Ingredients</h3>
                <div className="bg-gray-50 dark:bg-gray-900 border-0 rounded-md p-4 mb-4">
                  <ul className="space-y-3">
                    {ingredients.map((ingredient, index) => {
                      // Try to find food in the global foods list first
                      const food = foods?.find(f => f._id === ingredient.foodId);
                                            
                      return (
                        <li key={index} className="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md">
                          <div className="flex items-center">
                            <span className="dark:text-gray-200 font-medium">
                              {ingredient.quantity} {ingredient.unit}
                            </span>
                            <IngredientFoodName 
                              foodId={ingredient.foodId} 
                              foodFromList={food} 
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}

            {/* Add new ingredient */}
            <div className="bg-gray-50 dark:bg-gray-900 border-0 rounded-md p-4 mb-4">
              <h3 className="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">Add Ingredient</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <PaginatedSelect
                    label="Food"
                    placeholder="Search foods..."
                    loadOptions={async (page, search, limit) => {
                      const { foods, total } = await foodService.getPaginatedFoods(page, limit, search);
                      return {
                        options: foods.map(food => ({
                          value: food._id,
                          label: food.name,
                          data: food
                        })),
                        hasMore: total > page * limit,
                        total
                      };
                    }}
                    onChange={(selectedOption) => {
                      if (selectedOption) {
                        const selectedFood = selectedOption.data;
                        setNewIngredient({
                          ...newIngredient,
                          foodId: selectedOption.value,
                          unit: selectedFood?.serving?.unit || 'g' // Default to 'g' if no unit found
                        });
                      } else {
                        // Handle clear
                        setNewIngredient({
                          ...newIngredient,
                          foodId: '',
                          unit: 'g'
                        });
                      }
                    }}
                    value={newIngredient.foodId ? {
                      value: newIngredient.foodId,
                      label: foods?.find(f => f._id === newIngredient.foodId)?.name || 'Loading...'
                    } : null}
                    isDisabled={foodsLoading}
                    isClearable={true}
                    noOptionsMessage="No foods found. Try a different search term."
                    limit={20}
                    aria-label="Select food for ingredient"
                  />
                </div>
                <div>
                  <label htmlFor="quantity" className="form-label dark:text-gray-300">Quantity</label>
                  <input
                    id="quantity"
                    type="number"
                    className="form-input"
                    value={newIngredient.quantity}
                    onChange={(e) => setNewIngredient({ ...newIngredient, quantity: parseFloat(e.target.value) })}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label htmlFor="unit" className="form-label dark:text-gray-300">Unit</label>
                  <Select
                    id="unit"
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                    helpText={newIngredient.foodId && (() => {
                      const selectedFood = foods?.find(f => f._id === newIngredient.foodId);
                      if (selectedFood?.serving.unit !== newIngredient.unit) {
                        return `Food serving unit is ${selectedFood?.serving.unit}`;
                      }
                      return '';
                    })()}
                  >
                    <optgroup label="Weight">
                      {unitCategories.weight.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Volume">
                      {unitCategories.volume.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Count">
                      {unitCategories.count.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Descriptive">
                      {unitCategories.descriptive.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </optgroup>
                  </Select>
                </div>
              </div>
              {/* Information about the selected food */}
              {newIngredient.foodId && (
                <div className="mt-3 bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  {(() => {
                    const selectedFood = foods?.find(f => f._id === newIngredient.foodId);
                    if (!selectedFood) return null;

                    return (
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <p className="font-medium">{selectedFood.name}</p>
                        <p>
                          <span className="font-medium">Serving size:</span> {selectedFood.serving.size} {selectedFood.serving.unit}
                          {selectedFood.serving.weightInGrams && selectedFood.serving.unit !== 'g' && (
                            <span className="ml-1">({selectedFood.serving.weightInGrams}g)</span>
                          )}
                        </p>
                        <p>
                          <span className="font-medium">Nutritional info (per serving):</span> {selectedFood.nutrients.calories} calories,
                          {selectedFood.nutrients.protein}g protein, {selectedFood.nutrients.carbs}g carbs, {selectedFood.nutrients.fat}g fat
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="mt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addIngredient();
                  }}
                  className="btn btn-secondary"
                  disabled={!newIngredient.foodId}
                >
                  Add Ingredient
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Instructions</h2>
            <div className="bg-gray-50 dark:bg-gray-900 border-0 rounded-md p-4 mb-4">
              <div className="space-y-4">
                {instructions.map((step, index) => (
                  <div key={index} className="flex items-start">
                    <div className="mr-2 mt-2 dark:text-gray-300">{index + 1}.</div>
                    <div className="flex-grow">
                      <textarea
                        className="form-input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        value={step}
                        onChange={(e) => updateInstructionStep(index, e.target.value)}
                        placeholder={`Step ${index + 1} instructions...`}
                        rows={2}
                        style={{ resize: "vertical" }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeInstructionStep(index)}
                      className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      disabled={instructions.length <= 1}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addInstructionStep}
                  className="btn btn-secondary"
                >
                  Add Step
                </button>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Tags</h2>
            <div className="bg-gray-50 dark:bg-gray-900 border-0 rounded-md p-4 mb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  className="form-input flex-grow"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="ml-2 btn btn-secondary"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/recipes')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary dark:bg-primary-700 dark:hover:bg-primary-600"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Recipe'
            )}
          </button>
        </div>
      </form>

    </div>
  );
};

export default RecipeForm;
