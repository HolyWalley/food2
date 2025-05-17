import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import recipeService from '../../../services/recipeService';
import foodService from '../../../services/foodService';
import { type Food } from '../../../types';

const RecipeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch recipe data
  const { data: recipe, isLoading: recipeLoading, error: recipeError } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => (id ? recipeService.getRecipeById(id) : Promise.reject('No ID provided')),
    enabled: !!id
  });

  // Fetch ingredient foods data
  const { data: ingredientFoods, isLoading: ingredientsLoading } = useQuery({
    queryKey: ['recipeIngredients', recipe?.ingredients.map(i => i.foodId)],
    queryFn: async () => {
      if (!recipe) return [];
      
      // Get all foods needed for the ingredients
      const foods: Record<string, Food> = {};
      
      for (const ingredient of recipe.ingredients) {
        try {
          const food = await foodService.getFoodById(ingredient.foodId);
          foods[ingredient.foodId] = food;
        } catch (error) {
          console.error(`Failed to load food ${ingredient.foodId}:`, error);
        }
      }
      
      return foods;
    },
    enabled: !!recipe
  });

  // Calculate nutrition information
  const { data: nutrition, isLoading: nutritionLoading, error: nutritionError } = useQuery({
    queryKey: ['recipeNutrition', id],
    queryFn: () => (recipe ? recipeService.calculateRecipeNutrition(recipe) : Promise.reject('No recipe')),
    enabled: !!recipe,
    retry: 1, // Only retry once to avoid excessive error logs
    onError: (error) => {
      console.error('Error calculating recipe nutrition:', error);
    }
  });

  // Per serving nutrition
  const { data: nutritionPerServing, isLoading: nutritionPerServingLoading, error: nutritionPerServingError } = useQuery({
    queryKey: ['recipeNutritionPerServing', id, recipe?.servings],
    queryFn: () => (recipe ? recipeService.calculateNutritionPerServing(recipe) : Promise.reject('No recipe')),
    enabled: !!recipe && !nutritionError, // Only calculate per-serving if total nutrition succeeded
    retry: 1,
    onError: (error) => {
      console.error('Error calculating per-serving nutrition:', error);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (params: { id: string; rev: string }) => 
      recipeService.deleteRecipe(params.id, params.rev),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      navigate('/recipes');
    }
  });
  
  // Update servings mutation
  const updateServingsMutation = useMutation({
    mutationFn: (updatedRecipe: Recipe) => recipeService.updateRecipe(updatedRecipe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
    }
  });

  // Handle delete
  const handleDelete = () => {
    if (!recipe) return;
    
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      deleteMutation.mutate({ id: recipe._id, rev: recipe._rev || '' });
    }
  };

  // Loading state
  if (recipeLoading || ingredientsLoading || nutritionLoading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (recipeError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        Error loading recipe details: {(recipeError as Error).message}
      </div>
    );
  }

  // Not found state
  if (!recipe) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-300">Recipe Not Found</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">The recipe you're looking for doesn't exist or has been deleted.</p>
        <Link to="/recipes" className="btn btn-primary mt-6">
          Back to Recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link to="/recipes" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mr-4">
          <span className="material-symbols-outlined align-middle">arrow_back</span>
          <span className="align-middle ml-1">Back to Recipes</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{recipe.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{recipe.description}</p>
          </div>
          
          <div className="flex space-x-3 mt-4 md:mt-0">
            <Link to={`/recipes/${recipe._id}/edit`} className="btn btn-secondary">
              Edit
            </Link>
            <button 
              className="btn bg-red-500 text-white hover:bg-red-600"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Recipe info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 border border-gray-100 dark:border-gray-700 rounded text-center">
            <div className="flex items-center justify-center space-x-2">
              <button 
                type="button"
                onClick={() => {
                  if (recipe.servings > 1) {
                    const updatedRecipe = {...recipe, servings: recipe.servings - 1};
                    queryClient.setQueryData(['recipe', id], updatedRecipe);
                  }
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                disabled={recipe.servings <= 1}
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <div className="text-sm font-semibold dark:text-gray-200">{recipe.servings}</div>
              <button 
                type="button"
                onClick={() => {
                  const updatedRecipe = {...recipe, servings: recipe.servings + 1};
                  queryClient.setQueryData(['recipe', id], updatedRecipe);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() => {
                  if (recipe._rev) {
                    const updatedRecipe = {
                      ...recipe,
                      updatedAt: new Date().toISOString()
                    };
                    updateServingsMutation.mutate(updatedRecipe);
                  }
                }}
                className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                disabled={updateServingsMutation.isPending}
              >
                {updateServingsMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Servings</div>
          </div>
          
          {recipe.prepTime && (
            <div className="p-3 border border-gray-100 dark:border-gray-700 rounded text-center">
              <div className="text-sm font-semibold dark:text-gray-200">{recipe.prepTime} min</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Prep Time</div>
            </div>
          )}
          
          {recipe.cookTime && (
            <div className="p-3 border border-gray-100 dark:border-gray-700 rounded text-center">
              <div className="text-sm font-semibold dark:text-gray-200">{recipe.cookTime} min</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Cook Time</div>
            </div>
          )}
          
          {recipe.cookTime && recipe.prepTime && (
            <div className="p-3 border border-gray-100 dark:border-gray-700 rounded text-center">
              <div className="text-sm font-semibold dark:text-gray-200">{recipe.cookTime + recipe.prepTime} min</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Time</div>
            </div>
          )}
        </div>

        {/* Ingredients */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Ingredients</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
            {recipe.ingredients.map((ingredient, index) => {
              const food = ingredientFoods?.[ingredient.foodId];
              return (
                <li key={index}>
                  <span className="font-medium">{ingredient.quantity} {ingredient.unit}</span> {food?.name || `Unknown food (${ingredient.foodId})`}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Instructions</h2>
          <ol className="list-decimal pl-5 space-y-3 text-gray-700 dark:text-gray-300">
            {recipe.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>

        {/* Nutritional Information */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Nutritional Information (per serving)</h2>
          
          {nutritionPerServingLoading && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-center">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mx-auto"></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Calculating nutrition...</p>
            </div>
          )}
          
          {nutritionPerServingError && (
            <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
              <p className="text-orange-700 dark:text-orange-300 font-medium">Unable to calculate nutrition</p>
              <p className="text-orange-600 dark:text-orange-400 text-sm mt-1">There might be an issue with the ingredient data or unit conversions.</p>
              <p className="text-orange-500 dark:text-orange-500 text-xs mt-2">Try editing the recipe with valid ingredients and units.</p>
            </div>
          )}
          
          {!nutritionPerServingLoading && !nutritionPerServingError && nutritionPerServing && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">{Math.round(nutritionPerServing.calories)}</div>
                  <div className="text-sm text-green-600 dark:text-green-400">Calories</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{nutritionPerServing.protein.toFixed(1)}g</div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Protein</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg">
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{nutritionPerServing.carbs.toFixed(1)}g</div>
                  <div className="text-sm text-amber-600 dark:text-amber-400">Carbohydrates</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/30 p-4 rounded-lg">
                  <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{nutritionPerServing.fat.toFixed(1)}g</div>
                  <div className="text-sm text-rose-600 dark:text-rose-400">Fat</div>
                </div>
              </div>

              <h3 className="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Additional Nutrients</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {nutritionPerServing.fiber !== undefined && (
                  <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                    <div className="text-sm font-semibold dark:text-gray-200">{nutritionPerServing.fiber.toFixed(1)}g</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Fiber</div>
                  </div>
                )}
                {nutritionPerServing.sugar !== undefined && (
                  <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                    <div className="text-sm font-semibold dark:text-gray-200">{nutritionPerServing.sugar.toFixed(1)}g</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Sugar</div>
                  </div>
                )}
                {nutritionPerServing.sodium !== undefined && (
                  <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                    <div className="text-sm font-semibold dark:text-gray-200">{nutritionPerServing.sodium.toFixed(0)}mg</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Sodium</div>
                  </div>
                )}
                {nutritionPerServing.cholesterol !== undefined && (
                  <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                    <div className="text-sm font-semibold dark:text-gray-200">{nutritionPerServing.cholesterol.toFixed(0)}mg</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Cholesterol</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div>
            <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Created</span>
            <p className="dark:text-gray-300">{new Date(recipe.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Last Updated</span>
            <p className="dark:text-gray-300">{new Date(recipe.updatedAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">ID</span>
            <p className="font-mono text-sm dark:text-gray-300">{recipe._id}</p>
          </div>
          {recipe._rev && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">Revision</span>
              <p className="font-mono text-sm dark:text-gray-300">{recipe._rev}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetails;