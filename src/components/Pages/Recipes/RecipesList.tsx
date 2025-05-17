import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import recipeService from '../../../services/recipeService';
import db from '../../../services/db';
import { type Recipe } from '../../../types';

const RecipesList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all recipes
  const { data: recipes, isLoading, error, refetch } = useQuery({
    queryKey: ['recipes'],
    queryFn: recipeService.getAllRecipes
  });
  
  // Function to reset database indexes
  const handleResetIndexes = async () => {
    try {
      setIsResetting(true);
      await db.resetIndexes();
      // Invalidate queries to refetch data with new indexes
      await queryClient.invalidateQueries({ queryKey: ['recipes'] });
      await refetch();
      alert('Database indexes have been reset successfully. The data should now load correctly.');
    } catch (error) {
      console.error('Error resetting indexes:', error);
      alert(`Error resetting indexes: ${(error as Error).message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Filter recipes based on search term
  const filteredRecipes = recipes?.filter(recipe => {
    const searchLower = searchTerm.toLowerCase();
    return (
      recipe.name.toLowerCase().includes(searchLower) ||
      recipe.description.toLowerCase().includes(searchLower) ||
      (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchLower)))
    );
  });

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
        <p className="mb-3">Error loading recipes: {(error as Error).message}</p>
        
        <div className="mt-3">
          <p className="text-gray-700 dark:text-gray-300 mb-2">This might be caused by a database index issue. Try resetting the indexes to fix the problem:</p>
          <button 
            className="btn btn-secondary dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600" 
            onClick={handleResetIndexes}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting Indexes...' : 'Reset Database Indexes'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0 dark:text-gray-200">Recipes</h1>
        <Link to="/recipes/new" className="btn btn-primary">
          Add New Recipe
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search recipes..."
              className="form-input"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>
      </div>

      {!filteredRecipes || filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
            {recipes && recipes.length > 0 
              ? 'No recipes found matching your criteria.' 
              : 'No recipes yet. Get started by adding your first recipe!'}
          </p>
          <Link to="/recipes/new" className="btn btn-primary">
            Add New Recipe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map(recipe => (
            <RecipeCard key={recipe._id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
};

// Recipe card component
const RecipeCard = ({ recipe }: { recipe: Recipe }) => {
  return (
    <Link
      to={`/recipes/${recipe._id}`}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">{recipe.name}</h2>
        
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {recipe.description}
        </p>

        <div className="flex justify-between text-sm mb-4">
          <div className="flex flex-col">
            <span className="text-gray-500 dark:text-gray-400">Servings</span>
            <span className="font-medium dark:text-white">{recipe.servings}</span>
          </div>
          
          {recipe.prepTime && (
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400">Prep Time</span>
              <span className="font-medium dark:text-white">{recipe.prepTime} min</span>
            </div>
          )}
          
          {recipe.cookTime && (
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400">Cook Time</span>
              <span className="font-medium dark:text-white">{recipe.cookTime} min</span>
            </div>
          )}
        </div>

        <div className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          <span className="font-medium">{recipe.ingredients.length}</span> ingredients
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.map(tag => (
              <span
                key={tag}
                className="inline-block bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export default RecipesList;