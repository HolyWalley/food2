import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import recipeService from '../../../services/recipeService';
import foodService from '../../../services/foodService';
import { Select } from '../../../components/UI';
import type { Recipe, RecipeIngredient, Food } from '../../../types';

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

  // Fetch all foods for the ingredient dropdown
  const { data: foods, isLoading: foodsLoading } = useQuery({
    queryKey: ['foods'],
    queryFn: foodService.getAllFoods
  });

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Debug state
    console.log('Form submission - current state:', {
      name,
      description,
      servings,
      ingredients,
      instructions,
      tags
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
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pasta Primavera"
                  required
                />
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
                      const food = foods?.find(f => f._id === ingredient.foodId);
                      return (
                        <li key={index} className="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md">
                          <span className="dark:text-gray-200 font-medium">
                            {ingredient.quantity} {ingredient.unit} {food?.name || ingredient.foodId}
                          </span>
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
                  <Select
                    id="foodId"
                    label="Food"
                    value={newIngredient.foodId}
                    onChange={(e) => setNewIngredient({...newIngredient, foodId: e.target.value})}
                    disabled={foodsLoading}
                  >
                    <option value="">Select a food...</option>
                    {foods?.map(food => (
                      <option key={food._id} value={food._id}>
                        {food.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="quantity" className="form-label dark:text-gray-300">Quantity</label>
                  <input
                    id="quantity"
                    type="number"
                    className="form-input"
                    value={newIngredient.quantity}
                    onChange={(e) => setNewIngredient({...newIngredient, quantity: parseFloat(e.target.value)})}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label htmlFor="unit" className="form-label dark:text-gray-300">Unit</label>
                  <input
                    id="unit"
                    type="text"
                    className="form-input"
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({...newIngredient, unit: e.target.value})}
                    placeholder="g, ml, cup, etc."
                  />
                </div>
              </div>
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
                      style={{resize: "vertical"}}
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