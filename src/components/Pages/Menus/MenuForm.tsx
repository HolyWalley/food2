import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import menuService from '../../../services/menuService';
import foodService from '../../../services/foodService';
import recipeService from '../../../services/recipeService';
import { Select } from '../../../components/UI';
import { type MenuItem, type Food, type Recipe } from '../../../types';

const MenuForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Today's date in YYYY-MM-DD format
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // New item state
  const [newItem, setNewItem] = useState<{
    type: 'food' | 'recipe';
    itemId: string;
    portions: number;
  }>({
    type: 'food',
    itemId: '',
    portions: 1
  });

  // Fetch existing menu if editing
  const { data: existingMenu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', id],
    queryFn: () => (id ? menuService.getMenuById(id) : null),
    enabled: isEditing
  });

  // Fetch foods and recipes for the dropdown selection
  const { data: foods, isLoading: foodsLoading } = useQuery({
    queryKey: ['foods'],
    queryFn: foodService.getAllFoods
  });

  const { data: recipes, isLoading: recipesLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: recipeService.getAllRecipes
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: menuService.createMenu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      navigate('/menus');
    },
    onError: (error: Error) => {
      setError(`Failed to create menu: ${error.message}`);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: menuService.updateMenu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      queryClient.invalidateQueries({ queryKey: ['menu', id] });
      navigate(`/menus/${id}`);
    },
    onError: (error: Error) => {
      setError(`Failed to update menu: ${error.message}`);
    }
  });

  // Populate form with existing menu data when editing
  useEffect(() => {
    if (existingMenu) {
      setName(existingMenu.name);
      setDescription(existingMenu.description);
      setDate(existingMenu.date);
      setItems(existingMenu.items);
      setTags(existingMenu.tags || []);
    }
  }, [existingMenu]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!name) {
      setError('Menu name is required');
      return;
    }

    if (!date) {
      setError('Date is required');
      return;
    }

    // Validate menu items
    if (items.length === 0) {
      setError('At least one item is required');
      return;
    }

    try {
      // Validate that all items exist in the database
      const validation = await menuService.validateMenuItems(items);
      if (!validation.valid) {
        setError(`Some menu items could not be found: ${validation.missingItems.join(', ')}`);
        return;
      }

      // Create or update menu
      if (isEditing && existingMenu) {
        updateMutation.mutate({
          ...existingMenu,
          name,
          description,
          date,
          items,
          tags,
          updatedAt: new Date().toISOString()
        });
      } else {
        createMutation.mutate({
          name,
          description,
          date,
          items,
          tags
        });
      }
    } catch (error) {
      console.error('Error submitting menu:', error);
      setError(`An error occurred: ${(error as Error).message}`);
    }
  };

  // Add a new item to the menu
  const addItem = () => {
    if (!newItem.itemId) {
      setError('Please select an item');
      return;
    }

    if (newItem.portions <= 0) {
      setError('Portions must be greater than 0');
      return;
    }

    console.log('Adding item:', newItem);
    const updatedItems = [...items, { ...newItem }];
    console.log('Updated items:', updatedItems);
    setItems(updatedItems);
    
    // Reset new item form
    setNewItem({
      type: 'food',
      itemId: '',
      portions: 1
    });
  };

  // Remove an item from the menu
  const removeItem = (index: number) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  // Add a tag
  const addTag = () => {
    if (!newTag.trim()) return;
    if (!tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }
    setNewTag('');
  };

  // Remove a tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle pressing Enter in the tag input
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Get item name (food or recipe) by ID
  const getItemName = (type: 'food' | 'recipe', id: string): string => {
    if (type === 'food') {
      const food = foods?.find(f => f._id === id);
      return food?.name || 'Unknown food';
    } else {
      const recipe = recipes?.find(r => r._id === id);
      return recipe?.name || 'Unknown recipe';
    }
  };

  // Loading state
  if ((isEditing && menuLoading) || foodsLoading || recipesLoading) {
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link to="/menus" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mr-4">
          <span className="material-symbols-outlined align-middle">arrow_back</span>
          <span className="align-middle ml-1">Back to Menus</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
          {isEditing ? 'Edit Menu' : 'Create New Menu'}
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic information */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Menu Name*
              </label>
              <input
                type="text"
                id="name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date*
              </label>
              <input
                type="date"
                id="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Menu items section */}
          <div className="border-t border-b border-gray-200 dark:border-gray-700 py-6">
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Menu Items</h2>
            
            {/* Add new item */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="col-span-1">
                <Select
                  id="itemType"
                  label="Type"
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value as 'food' | 'recipe', itemId: '' })}
                >
                  <option value="food">Food</option>
                  <option value="recipe">Recipe</option>
                </Select>
              </div>

              <div className="col-span-2">
                <Select
                  id="itemId"
                  label={newItem.type === 'food' ? 'Food' : 'Recipe'}
                  value={newItem.itemId}
                  onChange={(e) => setNewItem({ ...newItem, itemId: e.target.value })}
                >
                  <option value="">Select {newItem.type === 'food' ? 'a food' : 'a recipe'}</option>
                  {newItem.type === 'food' && foods?.map(food => (
                    <option key={food._id} value={food._id}>{food.name}</option>
                  ))}
                  {newItem.type === 'recipe' && recipes?.map(recipe => (
                    <option key={recipe._id} value={recipe._id}>{recipe.name}</option>
                  ))}
                </Select>
              </div>

              <div className="col-span-1">
                <label htmlFor="portions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Portions
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    id="portions"
                    className="form-input"
                    min="0.25"
                    step="0.25"
                    value={newItem.portions}
                    onChange={(e) => setNewItem({ ...newItem, portions: parseFloat(e.target.value) || 0 })}
                  />
                  <button
                    type="button"
                    className="ml-2 btn btn-primary px-4"
                    onClick={addItem}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <div className="p-4 text-center border border-gray-200 dark:border-gray-700 rounded">
                <p className="text-gray-500 dark:text-gray-400">No items added yet. Add some items to your menu using the form above.</p>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Portions</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">{getItemName(item.type, item.itemId)}</td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            onClick={() => removeItem(index)}
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tags section */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <div 
                  key={tag} 
                  className="bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 px-3 py-1 rounded-full text-sm flex items-center"
                >
                  {tag}
                  <button 
                    type="button" 
                    onClick={() => removeTag(tag)} 
                    className="ml-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                id="tagInput"
                placeholder="Add a tag"
                className="form-input"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <button
                type="button"
                className="ml-2 btn btn-secondary"
                onClick={addTag}
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* Submission */}
          <div className="flex justify-end space-x-4">
            <Link to="/menus" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEditing
                ? 'Update Menu'
                : 'Create Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuForm;