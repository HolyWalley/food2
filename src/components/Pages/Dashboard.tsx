import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import foodService from '../../services/foodService';
import recipeService from '../../services/recipeService';
import menuService from '../../services/menuService';
import { useDatabase } from '../../contexts/DatabaseContext';

const Dashboard = () => {
  const { isOnline, isSyncing } = useDatabase();

  // Fetch summary data
  const { data: foods } = useQuery({
    queryKey: ['foods'],
    queryFn: foodService.getAllFoods,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const { data: recipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: recipeService.getAllRecipes,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const { data: menus } = useQuery({
    queryKey: ['menus'],
    queryFn: menuService.getAllMenus,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

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

      {/* Status bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <span 
            className={`inline-block w-3 h-3 rounded-full mr-2 ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></span>
          <span className="text-sm font-medium">
            {isOnline ? 'Online' : 'Offline'} Mode
          </span>
          {isSyncing && (
            <span className="ml-4 flex items-center text-sm text-blue-600">
              <svg 
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" 
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
        <div>
          <span className="text-sm text-gray-500">
            Last update: {new Date().toLocaleString()}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="bg-white rounded-lg shadow-sm p-6 flex items-center hover:shadow-md transition-shadow"
          >
            <div className={`p-3 rounded-full ${stat.color} mr-4`}>
              <span className="material-symbols-outlined text-xl">{stat.icon}</span>
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-sm text-gray-500">{stat.title}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="p-4 border border-gray-100 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <span className={`material-symbols-outlined text-xl ${action.color} mr-3`}>
                  {action.icon}
                </span>
                <h3 className="font-medium">{action.title}</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Foods */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Recent Foods</h2>
            <Link to="/foods" className="text-primary-600 hover:text-primary-800 text-sm">
              View All
            </Link>
          </div>
          
          {recentFoods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No foods added yet.</p>
              <Link to="/foods/new" className="btn btn-primary mt-4">Add Food</Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentFoods.map(food => (
                <li key={food._id} className="py-3">
                  <Link to={`/foods/${food._id}`} className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-md -mx-2">
                    <div>
                      <h3 className="font-medium text-gray-800">{food.name}</h3>
                      <p className="text-sm text-gray-500">{food.category}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      {food.nutrients.calories} kcal
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Recipes */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Recent Recipes</h2>
            <Link to="/recipes" className="text-primary-600 hover:text-primary-800 text-sm">
              View All
            </Link>
          </div>
          
          {recentRecipes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No recipes added yet.</p>
              <Link to="/recipes/new" className="btn btn-primary mt-4">Add Recipe</Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentRecipes.map(recipe => (
                <li key={recipe._id} className="py-3">
                  <Link to={`/recipes/${recipe._id}`} className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-md -mx-2">
                    <div>
                      <h3 className="font-medium text-gray-800">{recipe.name}</h3>
                      <p className="text-sm text-gray-500">{recipe.ingredients.length} ingredients</p>
                    </div>
                    <div className="text-sm text-gray-600">
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