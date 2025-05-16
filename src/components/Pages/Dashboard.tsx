import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import foodService from '../../services/foodService';
import recipeService from '../../services/recipeService';
import menuService from '../../services/menuService';
import db from '../../services/db';
import { useDatabase } from '../../contexts/DatabaseContext';

const Dashboard = () => {
  const { isOnline, isSyncing } = useDatabase();
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch summary data
  const { data: foods, error: foodError, refetch: refetchFoods } = useQuery({
    queryKey: ['foods'],
    queryFn: foodService.getAllFoods,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const { data: recipes, error: recipeError, refetch: refetchRecipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: recipeService.getAllRecipes,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const { data: menus, error: menuError, refetch: refetchMenus } = useQuery({
    queryKey: ['menus'],
    queryFn: menuService.getAllMenus,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Determine if there are any data fetching errors
  const hasErrors = foodError || recipeError || menuError;
  
  // Function to reset database indexes
  const handleResetIndexes = async () => {
    try {
      setIsResetting(true);
      await db.resetIndexes();
      
      // Invalidate all queries to refetch data with new indexes
      await queryClient.invalidateQueries();
      
      // Refetch data
      await Promise.all([
        refetchFoods(),
        refetchRecipes(),
        refetchMenus()
      ]);
      
      alert('Database indexes have been reset successfully. The data should now load correctly.');
    } catch (error) {
      console.error('Error resetting indexes:', error);
      alert(`Error resetting indexes: ${(error as Error).message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Stats for the summary cards
  const stats = [
    {
      title: 'Foods',
      count: foods?.length || 0,
      icon: 'nutrition',
      color: 'bg-green-100 text-green-800',
      link: '/foods'
    },
    {
      title: 'Recipes',
      count: recipes?.length || 0,
      icon: 'restaurant_menu',
      color: 'bg-blue-100 text-blue-800',
      link: '/recipes'
    },
    {
      title: 'Menus',
      count: menus?.length || 0,
      icon: 'menu_book',
      color: 'bg-purple-100 text-purple-800',
      link: '/menus'
    }
  ];

  // Quick actions
  const quickActions = [
    {
      title: 'Add Food',
      description: 'Add a new food item to your database',
      icon: 'add_circle',
      color: 'text-green-600',
      link: '/foods/new'
    },
    {
      title: 'Create Recipe',
      description: 'Create a new recipe using your food items',
      icon: 'add_circle',
      color: 'text-blue-600',
      link: '/recipes/new'
    },
    {
      title: 'Plan Menu',
      description: 'Plan a new menu with foods and recipes',
      icon: 'add_circle',
      color: 'text-purple-600',
      link: '/menus/new'
    }
  ];

  // Recent items to display (assuming we have the latest items at the beginning)
  const recentFoods = foods?.slice(0, 5) || [];
  const recentRecipes = recipes?.slice(0, 5) || [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Display any data fetching errors */}
      {hasErrors && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
          <p className="mb-3">
            {foodError && `Error loading foods: ${(foodError as Error).message}`}
            {recipeError && `Error loading recipes: ${(recipeError as Error).message}`}
            {menuError && `Error loading menus: ${(menuError as Error).message}`}
          </p>
          
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
      )}

      {/* Status bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <span 
            className={`inline-block w-3 h-3 rounded-full mr-2 ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></span>
          <span className="text-sm font-medium dark:text-gray-300">
            {isOnline ? 'Online' : 'Offline'} Mode
          </span>
          {isSyncing && (
            <span className="ml-4 flex items-center text-sm text-blue-600 dark:text-blue-400">
              <svg 
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" 
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
              Syncing data...
            </span>
          )}
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-4">
            Last update: {new Date().toLocaleString()}
          </span>
          {!hasErrors && (
            <button 
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
              onClick={handleResetIndexes}
              disabled={isResetting}
            >
              {isResetting ? 'Resetting...' : 'Reset DB Indexes'}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex items-center hover:shadow-md transition-shadow"
          >
            <div className={`p-3 rounded-full ${
              stat.color.includes('green') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
              stat.color.includes('blue') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
              stat.color.includes('purple') ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
              stat.color
            } mr-4`}>
              <span className="material-symbols-outlined text-xl">{stat.icon}</span>
            </div>
            <div>
              <div className="text-3xl font-bold dark:text-white">{stat.count}</div>
              <div className="text-sm text-gray-500 dark:text-gray-300">{stat.title}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center">
                <span className={`material-symbols-outlined text-xl ${action.color} dark:text-opacity-80 mr-3`}>
                  {action.icon}
                </span>
                <h3 className="font-medium dark:text-gray-200">{action.title}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Foods */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium dark:text-gray-200">Recent Foods</h2>
            <Link to="/foods" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-sm">
              View All
            </Link>
          </div>
          
          {recentFoods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No foods added yet.</p>
              <Link to="/foods/new" className="btn btn-primary dark:bg-primary-700 dark:hover:bg-primary-600 mt-4">Add Food</Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentFoods.map(food => (
                <li key={food._id} className="py-3">
                  <Link to={`/foods/${food._id}`} className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md -mx-2">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-gray-200">{food.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{food.category}</p>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {food.nutrients.calories} kcal
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Recipes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium dark:text-gray-200">Recent Recipes</h2>
            <Link to="/recipes" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-sm">
              View All
            </Link>
          </div>
          
          {recentRecipes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No recipes added yet.</p>
              <Link to="/recipes/new" className="btn btn-primary dark:bg-primary-700 dark:hover:bg-primary-600 mt-4">Add Recipe</Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentRecipes.map(recipe => (
                <li key={recipe._id} className="py-3">
                  <Link to={`/recipes/${recipe._id}`} className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md -mx-2">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-gray-200">{recipe.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{recipe.ingredients.length} ingredients</p>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {recipe.servings} servings
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;