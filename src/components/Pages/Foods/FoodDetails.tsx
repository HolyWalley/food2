import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import foodService from '../../../services/foodService';
import { withViewTransition } from '../../../utils/viewTransition';

const FoodDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch food data
  const { data: food, isLoading, error } = useQuery({
    queryKey: ['food', id],
    queryFn: () => (id ? foodService.getFoodById(id) : Promise.reject('No ID provided')),
    enabled: !!id
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (params: { id: string; rev: string }) => 
      foodService.deleteFood(params.id, params.rev),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      navigate('/foods');
    }
  });

  // Handle delete
  const handleDelete = () => {
    if (!food) return;
    
    if (window.confirm('Are you sure you want to delete this food item?')) {
      deleteMutation.mutate({ id: food._id, rev: food._rev || '' });
    }
  };

  // Render loading state
  if (isLoading) {
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

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        Error loading food details: {(error as Error).message}
      </div>
    );
  }

  // Render not found state
  if (!food) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-300">Food Not Found</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">The food item you're looking for doesn't exist or has been deleted.</p>
        <Link to="/foods" className="btn btn-primary mt-6">
          Back to Foods
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link 
          to="/foods" 
          onClick={async (e) => {
            e.preventDefault();
            await withViewTransition(() => {
              navigate('/foods');
            }, 'details-to-food');
          }}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mr-4"
        >
          <span className="material-symbols-outlined align-middle">arrow_back</span>
          <span className="align-middle ml-1">Back to Foods</span>
        </Link>
      </div>
      
      {/* Grid layout to match the food list for smoother transitions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Main card with view transition */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-3">
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden mb-4"
            style={{ viewTransitionName: `food-card-container-${food._id}` }}
          >
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-6">
                <div>
                  <div className="flex items-center">
                    <h1 
                      className="text-2xl font-bold text-gray-800 dark:text-gray-200"
                      style={{ viewTransitionName: `food-title-${food._id}` }}
                    >
                      {food.name}
                    </h1>
                    <span 
                      className="ml-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm px-3 py-1 rounded"
                      style={{ viewTransitionName: `food-category-${food._id}` }}
                    >
                      {food.category}
                    </span>
                  </div>
                  <p 
                    className="text-gray-600 dark:text-gray-400 mt-1"
                    style={{ viewTransitionName: `food-serving-${food._id}` }}
                  >
                    Serving size: {food.serving.size} {food.serving.unit}
                  </p>
                </div>
                
                <div className="flex space-x-3 mt-4 md:mt-0">
                  <Link to={`/foods/${food._id}/edit`} className="btn btn-secondary">
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

              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Nutritional Information</h2>
                <div 
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
                  style={{ viewTransitionName: `food-nutrients-${food._id}` }}
                >
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                      {food.nutrients.calories}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Calories
                      <span 
                        className="ml-1 inline-flex items-center text-green-500 dark:text-green-400 cursor-help"
                        title="Calculated using 4 cal/g for protein and carbs, 9 cal/g for fat"
                      >
                        <span className="material-symbols-outlined text-xs">info</span>
                      </span>
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{food.nutrients.protein}g</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Protein</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg">
                    <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{food.nutrients.carbs}g</div>
                    <div className="text-sm text-amber-600 dark:text-amber-400">Carbohydrates</div>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-900/30 p-4 rounded-lg">
                    <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{food.nutrients.fat}g</div>
                    <div className="text-sm text-rose-600 dark:text-rose-400">Fat</div>
                  </div>
                </div>

                <h3 className="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Additional Nutrients</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {food.nutrients.fiber !== undefined && (
                    <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                      <div className="text-sm font-semibold dark:text-gray-200">{food.nutrients.fiber}g</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Fiber</div>
                    </div>
                  )}
                  {food.nutrients.sugar !== undefined && (
                    <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                      <div className="text-sm font-semibold dark:text-gray-200">{food.nutrients.sugar}g</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Sugar</div>
                    </div>
                  )}
                  {food.nutrients.sodium !== undefined && (
                    <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                      <div className="text-sm font-semibold dark:text-gray-200">{food.nutrients.sodium}mg</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Sodium</div>
                    </div>
                  )}
                  {food.nutrients.cholesterol !== undefined && (
                    <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                      <div className="text-sm font-semibold dark:text-gray-200">{food.nutrients.cholesterol}mg</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Cholesterol</div>
                    </div>
                  )}
                </div>
              </div>

              {food.allergens && food.allergens.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Allergens</h2>
                  <div className="flex flex-wrap gap-2">
                    {food.allergens.map(allergen => (
                      <span
                        key={allergen}
                        className="inline-flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {food.tags && food.tags.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Tags</h2>
                  <div 
                    className="flex flex-wrap gap-2"
                    style={{ viewTransitionName: `food-tags-${food._id}` }}
                  >
                    {food.tags.map(tag => (
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
          </div>

          {/* Metadata section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Metadata</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-sm">Created</span>
                <p className="dark:text-gray-300">{new Date(food.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-sm">Last Updated</span>
                <p className="dark:text-gray-300">{new Date(food.updatedAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-sm">ID</span>
                <p className="font-mono text-sm dark:text-gray-300">{food._id}</p>
              </div>
              {food._rev && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Revision</span>
                  <p className="font-mono text-sm dark:text-gray-300">{food._rev}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodDetails;