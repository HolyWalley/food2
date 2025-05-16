import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import menuService from '../../../services/menuService';
import shoppingListService, { type ShoppingListItem } from '../../../services/shoppingListService';
import { withViewTransition } from '../../../utils/viewTransition';

const ShoppingList = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch menu data
  const { data: menu, isLoading: menuLoading, error: menuError } = useQuery({
    queryKey: ['menu', id],
    queryFn: () => (id ? menuService.getMenuById(id) : Promise.reject('No ID provided')),
    enabled: !!id
  });

  // Generate shopping list
  const { data: shoppingList, isLoading: listLoading, error: listError } = useQuery({
    queryKey: ['shoppingList', id],
    queryFn: async () => {
      if (!menu) return [];
      const list = await shoppingListService.generateShoppingList(menu);
      return list;
    },
    enabled: !!menu
  });
  
  // Get unique categories from shopping list
  const categories = Array.from(
    new Set(shoppingList?.map(item => item.category) || [])
  ).sort();

  // Filter shopping list by selected categories
  const filteredList = selectedCategories.length > 0
    ? shoppingList?.filter(item => selectedCategories.includes(item.category))
    : shoppingList;

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Select all categories
  const selectAllCategories = () => {
    setSelectedCategories(categories);
  };

  // Clear all selected categories
  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  // Print shopping list
  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const originalContent = document.body.innerHTML;
      
      document.body.innerHTML = `
        <div style="padding: 20px;">
          <h1 style="text-align: center; margin-bottom: 20px;">Shopping List${menu ? ` for ${menu.name}` : ''}</h1>
          ${printContent}
        </div>
      `;
      
      window.print();
      document.body.innerHTML = originalContent;
      
      // Re-render the component after printing
      window.location.reload();
    }
  };

  // Loading state
  if (menuLoading || listLoading) {
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
  if (menuError || listError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        Error generating shopping list: {((menuError || listError) as Error).message}
      </div>
    );
  }

  // No menu found
  if (!menu) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-300">Menu Not Found</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">The menu you're looking for doesn't exist or has been deleted.</p>
        <Link to="/menus" className="btn btn-primary mt-6">
          Back to Menus
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link 
          to={`/menus/${menu._id}`} 
          onClick={async (e) => {
            e.preventDefault();
            await withViewTransition(() => {
              navigate(`/menus/${menu._id}`);
            });
          }}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mr-4"
        >
          <span className="material-symbols-outlined align-middle">arrow_back</span>
          <span className="align-middle ml-1">Back to Menu</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Shopping List for {menu.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {new Date(menu.date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handlePrint}
              className="btn btn-primary flex items-center"
            >
              <span className="material-symbols-outlined mr-2">print</span>
              Print List
            </button>
          </div>
        </div>

        {!shoppingList || shoppingList.length === 0 ? (
          <div className="p-4 text-center border border-gray-200 dark:border-gray-700 rounded">
            <p className="text-gray-500 dark:text-gray-400">No items in shopping list. Add foods or recipes to your menu first.</p>
          </div>
        ) : (
          <>
            {/* Category filter */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Filter by Category</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={selectAllCategories}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={clearAllCategories}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
                      selectedCategories.includes(category)
                        ? 'bg-primary-500 text-white dark:bg-primary-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Shopping list */}
            <div ref={printRef}>
              {categories
                .filter(category => selectedCategories.length === 0 || selectedCategories.includes(category))
                .map(category => {
                  const categoryItems = shoppingList.filter(item => item.category === category);
                  if (categoryItems.length === 0) return null;
                
                  return (
                    <div key={category} className="mb-6">
                      <h3 className="text-md font-medium mb-2 text-gray-700 dark:text-gray-300 pb-1 border-b border-gray-200 dark:border-gray-700">
                        {category}
                      </h3>
                      <ul className="space-y-2">
                        {categoryItems.map((item, index) => (
                          <li 
                            key={`${item.foodId}-${index}`}
                            className="flex justify-between py-2"
                          >
                            <span className="dark:text-gray-300">{item.name}</span>
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {shoppingListService.formatQuantityAndUnit(item.quantity, item.unit)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;