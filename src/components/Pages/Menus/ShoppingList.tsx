import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import menuService from '../../../services/menuService';
import shoppingListService from '../../../services/shoppingListService';
import { withViewTransition } from '../../../utils/viewTransition';

interface CheckedItemsState {
  [key: string]: boolean;
}

const ShoppingList = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<CheckedItemsState>({});
  const [days, setDays] = useState<number>(1);
  const printRef = useRef<HTMLDivElement>(null);
  
  // Reset checked state on component mount (page reload)
  useEffect(() => {
    setCheckedItems({});
  }, []);

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
  
  // Scale shopping list items by the number of days
  const scaledShoppingList = useMemo(() => {
    return shoppingList?.map(item => ({
      ...item,
      quantity: parseFloat((item.quantity * days).toFixed(2))
    }));
  }, [shoppingList, days]);
  
  // Get unique categories from shopping list
  const categories = Array.from(
    new Set(scaledShoppingList?.map(item => item.category) || [])
  ).sort();

  // Filter shopping list by selected categories
  const filteredList = selectedCategories.length > 0
    ? scaledShoppingList?.filter(item => selectedCategories.includes(item.category))
    : scaledShoppingList;

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
  
  // Toggle checked state of an item
  const toggleItemChecked = (itemKey: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };
  
  // Check all items in the shopping list
  const checkAllItems = () => {
    const newCheckedItems: CheckedItemsState = {};
    
    // Only check items that are currently visible (based on category filter)
    if (filteredList) {
      filteredList.forEach((item) => {
        // Use a stable key that doesn't include the scaled quantity
        const itemKey = `${item.foodId}-${item.unit}`;
        newCheckedItems[itemKey] = true;
      });
    }
    
    setCheckedItems(newCheckedItems);
  };
  
  // Uncheck all items
  const uncheckAllItems = () => {
    setCheckedItems({});
  };

  // Print shopping list
  const handlePrint = () => {
    if (printRef.current) {
      // Clone the content to preserve the checkboxes' checked state
      const printContent = printRef.current.cloneNode(true) as HTMLElement;
      
      // Update checkboxes in the cloned content to show their checked state
      const checkboxes = printContent.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox) => {
        const checkboxElement = checkbox as HTMLInputElement;
        // We don't need to access the label element directly
        
        // Remove the checkbox (it won't print well) and instead use a visual indicator
        if (checkboxElement.checked) {
          const checkIcon = document.createElement('span');
          checkIcon.innerHTML = '✓ ';
          checkIcon.style.color = '#4f46e5'; // Primary color
          checkboxElement.parentNode?.insertBefore(checkIcon, checkboxElement);
        } else {
          const uncheckIcon = document.createElement('span');
          uncheckIcon.innerHTML = '□ ';
          uncheckIcon.style.color = '#9ca3af'; // Gray color
          checkboxElement.parentNode?.insertBefore(uncheckIcon, checkboxElement);
        }
        
        // Remove the actual checkbox as it doesn't print well
        checkboxElement.remove();
      });
      
      // Store original content
      const originalContent = document.body.innerHTML;
      
      // Set print content
      document.body.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="text-align: center; margin-bottom: 20px;">Shopping List${menu ? ` for ${menu.name}` : ''}</h1>
          <p style="text-align: center; margin-bottom: 20px; color: #666;">${
            menu ? new Date(menu.date).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : ''
          }</p>
          ${days > 1 ? `<p style="text-align: center; margin-bottom: 20px; color: #666;">Quantities for ${days} days</p>` : ''}
          ${printContent.outerHTML}
        </div>
      `;
      
      // Add print styles
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          body { font-family: Arial, sans-serif; }
          h3 { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 20px; }
          li { padding: 5px 0; display: flex; justify-content: space-between; }
          .line-through { text-decoration: line-through; color: #999; }
        }
      `;
      document.head.appendChild(style);
      
      // Print the document
      window.print();
      
      // Restore original content
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
            
            {/* Days control */}
            <div className="mt-3 flex items-center">
              <span className="text-gray-700 dark:text-gray-300 text-sm mr-2">Days:</span>
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded">
                <button
                  onClick={() => setDays(prev => Math.max(1, prev - 1))}
                  className="px-2 py-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                  aria-label="Decrease days"
                  disabled={days <= 1}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>remove</span>
                </button>
                <span className="px-3 py-1 min-w-[40px] text-center text-gray-800 dark:text-gray-200 font-medium">
                  {days}
                </span>
                <button
                  onClick={() => setDays(prev => prev + 1)}
                  className="px-2 py-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                  aria-label="Increase days"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 flex items-center space-x-4">
            {scaledShoppingList && scaledShoppingList.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mr-2">
                    <div 
                      className="bg-primary-600 dark:bg-primary-500 h-2.5 rounded-full" 
                      style={{ 
                        width: `${scaledShoppingList?.length > 0 
                          ? (Object.values(checkedItems).filter(Boolean).length / scaledShoppingList.length) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span>
                    {Object.values(checkedItems).filter(Boolean).length}/{scaledShoppingList?.length} items
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={handlePrint}
              className="btn btn-primary flex items-center"
            >
              <span className="material-symbols-outlined mr-2">print</span>
              Print List
            </button>
          </div>
        </div>

        {!scaledShoppingList || scaledShoppingList.length === 0 ? (
          <div className="p-8 text-center border border-gray-200 dark:border-gray-700 rounded">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No items in shopping list. Add foods or recipes to your menu first.</p>
          </div>
        ) : (
          <>
            {/* Category filter */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Filter by Category</h2>
                <div className="flex space-x-4">
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
                  <div className="h-4 border-r border-gray-300 dark:border-gray-600"></div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={checkAllItems}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                    >
                      Check All
                    </button>
                    <button 
                      onClick={uncheckAllItems}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                    >
                      Uncheck All
                    </button>
                  </div>
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
                  const categoryItems = scaledShoppingList.filter(item => item.category === category);
                  if (categoryItems.length === 0) return null;
                
                  return (
                    <div key={category} className="mb-6">
                      <h3 className="text-md font-medium mb-2 text-gray-700 dark:text-gray-300 pb-1 border-b border-gray-200 dark:border-gray-700">
                        {category}
                      </h3>
                      <ul className="space-y-2">
                        {categoryItems.map((item, index) => {
                          // Use a stable key that doesn't include the scaled quantity
                          const itemKey = `${item.foodId}-${item.unit}`;
                          const isChecked = !!checkedItems[itemKey];
                          
                          return (
                            <li 
                              key={`${item.foodId}-${index}`}
                              className={`flex justify-between py-2 items-center transition-colors duration-200 ${
                                isChecked ? 'text-gray-400 dark:text-gray-500' : ''
                              }`}
                            >
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={itemKey}
                                  checked={isChecked}
                                  onChange={() => toggleItemChecked(itemKey)}
                                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                                />
                                <label 
                                  htmlFor={itemKey}
                                  className={`cursor-pointer ${
                                    isChecked 
                                      ? 'line-through text-gray-400 dark:text-gray-500' 
                                      : 'dark:text-gray-300'
                                  }`}
                                >
                                  {item.name}
                                </label>
                              </div>
                              <span className={`font-medium ${
                                isChecked 
                                  ? 'text-gray-400 dark:text-gray-500' 
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {shoppingListService.formatQuantityAndUnit(item.quantity, item.unit)}
                                {days > 1 && shoppingList && (
                                  <span className="text-xs ml-1 text-gray-500">
                                    (per day: {shoppingListService.formatQuantityAndUnit(
                                      shoppingList.find(original => original.foodId === item.foodId && original.unit === item.unit)?.quantity || 0, 
                                      item.unit
                                    )})
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
            </div>
            
            {/* Shopping list summary */}
            {scaledShoppingList && scaledShoppingList.length > 0 && (
              <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <div>
                  Total items: <span className="font-medium">{scaledShoppingList.length}</span>
                </div>
                <div>
                  Checked: <span className="font-medium">{Object.values(checkedItems).filter(Boolean).length}</span> | 
                  Remaining: <span className="font-medium">{scaledShoppingList.length - Object.values(checkedItems).filter(Boolean).length}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;