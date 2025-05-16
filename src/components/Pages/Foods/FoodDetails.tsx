import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import foodService from '../../../services/foodService';

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
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading food details: {(error as Error).message}
      </div>
    );
  }

  // Render not found state
  if (!food) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-600">Food Not Found</h2>
        <p className="mt-2 text-gray-500">The food item you're looking for doesn't exist or has been deleted.</p>
        <Link to="/foods" className="btn btn-primary mt-6">
          Back to Foods
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link to="/foods" className="text-gray-500 hover:text-gray-700 mr-4">
          <span className="material-symbols-outlined align-middle">arrow_back</span>
          <span className="align-middle ml-1">Back to Foods</span>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6">
          <div>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-800">{food.name}</h1>
              <span className="ml-3 bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded">
                {food.category}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
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
          <h2 className="text-lg font-medium mb-3 text-gray-800">Nutritional Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-green-700">{food.nutrients.calories}</div>
              <div className="text-sm text-green-600">Calories</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-blue-700">{food.nutrients.protein}g</div>
              <div className="text-sm text-blue-600">Protein</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-amber-700">{food.nutrients.carbs}g</div>
              <div className="text-sm text-amber-600">Carbohydrates</div>
            </div>
            <div className="bg-rose-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-rose-700">{food.nutrients.fat}g</div>
              <div className="text-sm text-rose-600">Fat</div>
            </div>
          </div>

          <h3 className="text-md font-medium mb-2 text-gray-700">Additional Nutrients</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {food.nutrients.fiber !== undefined && (
              <div className="p-3 border border-gray-100 rounded">
                <div className="text-sm font-semibold">{food.nutrients.fiber}g</div>
                <div className="text-xs text-gray-500">Fiber</div>
              </div>
            )}
            {food.nutrients.sugar !== undefined && (
              <div className="p-3 border border-gray-100 rounded">
                <div className="text-sm font-semibold">{food.nutrients.sugar}g</div>
                <div className="text-xs text-gray-500">Sugar</div>
              </div>
            )}
            {food.nutrients.sodium !== undefined && (
              <div className="p-3 border border-gray-100 rounded">
                <div className="text-sm font-semibold">{food.nutrients.sodium}mg</div>
                <div className="text-xs text-gray-500">Sodium</div>
              </div>
            )}
            {food.nutrients.cholesterol !== undefined && (
              <div className="p-3 border border-gray-100 rounded">
                <div className="text-sm font-semibold">{food.nutrients.cholesterol}mg</div>
                <div className="text-xs text-gray-500">Cholesterol</div>
              </div>
            )}
          </div>
        </div>

        {food.allergens && food.allergens.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-3 text-gray-800">Allergens</h2>
            <div className="flex flex-wrap gap-2">
              {food.allergens.map(allergen => (
                <span
                  key={allergen}
                  className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                >
                  {allergen}
                </span>
              ))}
            </div>
          </div>
        )}

        {food.tags && food.tags.length > 0 && (
          <div>
            <h2 className="text-lg font-medium mb-3 text-gray-800">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {food.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium mb-4 text-gray-800">Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-gray-500 text-sm">Created</span>
            <p>{new Date(food.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">Last Updated</span>
            <p>{new Date(food.updatedAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">ID</span>
            <p className="font-mono text-sm">{food._id}</p>
          </div>
          {food._rev && (
            <div>
              <span className="text-gray-500 text-sm">Revision</span>
              <p className="font-mono text-sm">{food._rev}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodDetails;