import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import menuService from '../../../services/menuService';
import foodService from '../../../services/foodService';
import recipeService from '../../../services/recipeService';
import { withViewTransition } from '../../../utils/viewTransition';
// Types imported from services

const MenuDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const cloneInputRef = useRef<HTMLInputElement>(null);

  // Fetch menu data
  const { data: menu, isLoading: menuLoading, error: menuError } = useQuery({
    queryKey: ['menu', id],
    queryFn: () => (id ? menuService.getMenuById(id) : Promise.reject('No ID provided')),
    enabled: !!id
  });

  // Fetch all foods and recipes for menu items
  const { data: foods } = useQuery({
    queryKey: ['foods'],
    queryFn: foodService.getAllFoods,
    enabled: !!menu
  });

  const { data: recipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: recipeService.getAllRecipes,
    enabled: !!menu
  });

  // Calculate nutrition information for the menu
  const { data: nutrition, isLoading: nutritionLoading, error: nutritionError } = useQuery({
    queryKey: ['menuNutrition', id],
    queryFn: () => (menu ? menuService.calculateMenuNutrition(menu) : Promise.reject('No menu')),
    enabled: !!menu,
    retry: 1,
    onError: (error) => {
      console.error('Error calculating menu nutrition:', error);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (params: { id: string; rev: string }) => 
      menuService.deleteMenu(params.id, params.rev),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      navigate('/menus');
    }
  });

  // Handle delete
  const handleDelete = () => {
    if (!menu) return;
    
    if (window.confirm('Are you sure you want to delete this menu?')) {
      deleteMutation.mutate({ id: menu._id, rev: menu._rev || '' });
    }
  };

  // Clone mutation
  const cloneMutation = useMutation({
    mutationFn: (clonedMenu: Omit<typeof menu, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>) => 
      menuService.createMenu(clonedMenu),
    onSuccess: async (newMenu) => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      setShowCloneModal(false);
      // Navigate to the newly created menu with view transition
      await withViewTransition(() => {
        navigate(`/menus/${newMenu._id}`);
      });
    },
    onError: (error) => {
      console.error('Error cloning menu:', error);
      alert(`Error cloning menu: ${(error as Error).message}`);
    }
  });

  // Handle clone button click
  const handleCloneClick = () => {
    if (!menu) return;
    setCloneName(`${menu.name} (copy)`);
    setShowCloneModal(true);
    
    // Focus the input field after the modal is shown
    setTimeout(() => {
      if (cloneInputRef.current) {
        cloneInputRef.current.focus();
        cloneInputRef.current.select();
      }
    }, 100);
  };
  
  // Handle clone menu submission
  const handleCloneMenu = () => {
    if (!menu || !cloneName.trim()) return;
    
    // Create a new menu object based on the original menu
    const clonedMenu = {
      name: cloneName.trim(),
      description: menu.description,
      items: [...menu.items],
      tags: menu.tags ? [...menu.tags] : undefined
    };
    
    // Save the cloned menu
    cloneMutation.mutate(clonedMenu);
  };

  // Get item name from ID
  const getItemName = (type: 'food' | 'recipe', id: string): string => {
    if (type === 'food') {
      const food = foods?.find(f => f._id === id);
      return food?.name || 'Unknown food';
    } else {
      const recipe = recipes?.find(r => r._id === id);
      return recipe?.name || 'Unknown recipe';
    }
  };
  
  // Navigate to item details
  const navigateToItemDetails = async (type: 'food' | 'recipe', id: string) => {
    if (!id) return;
    
    const path = type === 'food' ? `/foods/${id}` : `/recipes/${id}`;
    await withViewTransition(() => {
      navigate(path);
    });
  };

  // Render loading state
  if (menuLoading) {
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
  if (menuError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        Error loading menu details: {(menuError as Error).message}
      </div>
    );
  }

  // Render not found state
  if (!menu) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-300">Menu Not Found</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">The menu you're looking for doesn't exist or has been deleted.</p>
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-primary mt-6"
        >
          Go Back
        </button>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <button 
          onClick={async () => {
            await withViewTransition(() => {
              // Use browser history to navigate back
              navigate(-1);
            });
          }}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mr-4 flex items-center"
        >
          <span className="material-symbols-outlined align-middle">arrow_back</span>
          <span className="align-middle ml-1">Back</span>
        </button>
      </div>
      
      {/* Grid layout to match the menu list for smoother transitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main card with view transition */}
        <div className="col-span-1 md:col-span-2">
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden mb-4"
            style={{ viewTransitionName: `menu-card-container-${menu._id}` }}
          >
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-6">
                <div>
                  <h1 
                    className="text-2xl font-bold text-gray-800 dark:text-gray-200"
                    style={{ viewTransitionName: `menu-title-${menu._id}` }}
                  >
                    {menu.name}
                  </h1>
                  <p 
                    className="text-gray-600 dark:text-gray-400 mt-1"
                    style={{ viewTransitionName: `menu-description-${menu._id}` }}
                  >
                    {menu.description}
                  </p>
                </div>
                
                <div className="flex space-x-3 mt-4 md:mt-0">
                  <Link to={`/menus/${menu._id}/shopping-list`} className="btn btn-primary flex items-center">
                    <span className="material-symbols-outlined mr-1">shopping_cart</span>
                    Shopping List
                  </Link>
                  <button
                    className="btn btn-secondary flex items-center"
                    onClick={handleCloneClick}
                  >
                    <span className="material-symbols-outlined mr-1">content_copy</span>
                    Clone
                  </button>
                  <Link to={`/menus/${menu._id}/edit`} className="btn btn-secondary">
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

              <div 
                className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-4"
                style={{ viewTransitionName: `menu-items-${menu._id}` }}
              >
                <div className="flex items-center mr-4">
                  <span className="material-symbols-outlined text-sm mr-1">update</span>
                  <span>Updated: {new Date(menu.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <span className="material-symbols-outlined text-sm mr-1">restaurant_menu</span>
                  <span>{menu.items.length} items</span>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Menu Items</h2>
                {menu.items.length === 0 ? (
                  <div className="p-8 text-center border border-gray-200 dark:border-gray-700 rounded">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No items added to this menu yet.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Portions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {menu.items.map((item, index) => (
                          <tr 
                            key={index} 
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                            onClick={() => navigateToItemDetails(item.type, item.itemId)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">
                              <div className="flex items-center">
                                <span>{getItemName(item.type, item.itemId)}</span>
                                <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 ml-1" style={{ fontSize: '1rem' }}>
                                  open_in_new
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded ${
                                item.type === 'food' 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              }`}>
                                {item.type === 'food' ? 'Food' : 'Recipe'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right dark:text-gray-200">{item.portions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Nutritional Information */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Nutritional Information</h2>
                
                {nutritionLoading && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-center">
                    <div className="animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mx-auto mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mx-auto"></div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Calculating nutrition...</p>
                  </div>
                )}
                
                {nutritionError && (
                  <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
                    <p className="text-orange-700 dark:text-orange-300 font-medium">Unable to calculate nutrition</p>
                    <p className="text-orange-600 dark:text-orange-400 text-sm mt-1">There might be an issue retrieving nutritional data for some menu items.</p>
                  </div>
                )}
                
                {!nutritionLoading && !nutritionError && nutrition && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                      <div className="text-lg font-bold text-green-700 dark:text-green-300">{Math.round(nutrition.calories)}</div>
                      <div className="text-sm text-green-600 dark:text-green-400">Calories</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{nutrition.protein.toFixed(1)}g</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">Protein</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg">
                      <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{nutrition.carbs.toFixed(1)}g</div>
                      <div className="text-sm text-amber-600 dark:text-amber-400">Carbohydrates</div>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/30 p-4 rounded-lg">
                      <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{nutrition.fat.toFixed(1)}g</div>
                      <div className="text-sm text-rose-600 dark:text-rose-400">Fat</div>
                    </div>
                  </div>
                )}

                {!nutritionLoading && !nutritionError && nutrition && (
                  <>
                    <h3 className="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Additional Nutrients</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {nutrition.fiber !== undefined && (
                        <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                          <div className="text-sm font-semibold dark:text-gray-200">{nutrition.fiber.toFixed(1)}g</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Fiber</div>
                        </div>
                      )}
                      {nutrition.sugar !== undefined && (
                        <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                          <div className="text-sm font-semibold dark:text-gray-200">{nutrition.sugar.toFixed(1)}g</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Sugar</div>
                        </div>
                      )}
                      {nutrition.sodium !== undefined && (
                        <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                          <div className="text-sm font-semibold dark:text-gray-200">{nutrition.sodium.toFixed(0)}mg</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Sodium</div>
                        </div>
                      )}
                      {nutrition.cholesterol !== undefined && (
                        <div className="p-3 border border-gray-100 dark:border-gray-700 rounded">
                          <div className="text-sm font-semibold dark:text-gray-200">{nutrition.cholesterol.toFixed(0)}mg</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Cholesterol</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {menu.tags && menu.tags.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Tags</h2>
                  <div 
                    className="flex flex-wrap gap-2"
                    style={{ viewTransitionName: `menu-tags-${menu._id}` }}
                  >
                    {menu.tags.map(tag => (
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
                <p className="dark:text-gray-300">{new Date(menu.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-sm">Last Updated</span>
                <p className="dark:text-gray-300">{new Date(menu.updatedAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-sm">ID</span>
                <p className="font-mono text-sm dark:text-gray-300">{menu._id}</p>
              </div>
              {menu._rev && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Revision</span>
                  <p className="font-mono text-sm dark:text-gray-300">{menu._rev}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Clone Menu Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 dark:text-gray-200">Clone Menu</h2>
            
            <div className="mb-4">
              <label htmlFor="cloneMenuName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Menu Name
              </label>
              <input
                ref={cloneInputRef}
                id="cloneMenuName"
                type="text"
                className="form-input w-full"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCloneMenu();
                  if (e.key === 'Escape') setShowCloneModal(false);
                }}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCloneModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary flex items-center"
                onClick={handleCloneMenu}
                disabled={!cloneName.trim() || cloneMutation.isPending}
              >
                {cloneMutation.isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin mr-1">progress_activity</span>
                    Cloning...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined mr-1">content_copy</span>
                    Clone
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuDetails;