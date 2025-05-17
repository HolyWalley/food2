import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import foodService from '../../../services/foodService';
import { Select, FoodSearch } from '../../../components/UI';
import type { Food, NutritionInfo, ServingInfo } from '../../../types';
import type { FoodData } from '../../../components/UI/FoodSearch';

const FoodForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [servingSize, setServingSize] = useState(100);
  const [servingUnit, setServingUnit] = useState('g');
  const [servingWeightGrams, setServingWeightGrams] = useState<number | undefined>(undefined);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [fiber, setFiber] = useState<number | undefined>(undefined);
  const [sugar, setSugar] = useState<number | undefined>(undefined);
  const [sodium, setSodium] = useState<number | undefined>(undefined);
  const [cholesterol, setCholesterol] = useState<number | undefined>(undefined);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newAllergen, setNewAllergen] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showNutritionixSearch, setShowNutritionixSearch] = useState(!isEditMode);

  // Calculate calories from macros in real-time
  const calculatedCalories = useMemo(() => {
    return foodService.calculateCaloriesFromMacros(protein, carbs, fat);
  }, [protein, carbs, fat]);

  // Categories for the dropdown
  const categories = [
    'Fruits',
    'Vegetables',
    'Grains',
    'Proteins',
    'Dairy',
    'Fats and Oils',
    'Beverages',
    'Snacks',
    'Condiments',
    'Other'
  ];

  // Units for the dropdown
  const units = [
    // Weight units
    'g', 'kg', 'oz', 'lb',
    // Volume units
    'ml', 'l', 'cup', 'tbsp', 'tsp',
    // Count units
    'piece', 'serving',
    // Size descriptors
    'small', 'medium', 'large',
    // Common food units
    'clove', 'slice', 'can', 'bottle', 'packet', 'container'
  ];

  // Unit categories for grouping in select
  const unitCategories = {
    weight: ['g', 'kg', 'oz', 'lb'],
    volume: ['ml', 'l', 'cup', 'tbsp', 'tsp'],
    count: ['piece', 'serving'],
    descriptive: ['small', 'medium', 'large', 'clove', 'slice', 'can', 'bottle', 'packet', 'container']
  };

  // Fetch food data if in edit mode
  const { data: foodData, isLoading } = useQuery({
    queryKey: ['food', id],
    queryFn: () => (id ? foodService.getFoodById(id) : null),
    enabled: isEditMode
  });

  // Set form data when food data is loaded
  useEffect(() => {
    if (foodData) {
      setName(foodData.name);
      setCategory(foodData.category);
      setServingSize(foodData.serving.size);
      setServingUnit(foodData.serving.unit);
      setServingWeightGrams(foodData.serving.weightInGrams);
      setProtein(foodData.nutrients.protein);
      setCarbs(foodData.nutrients.carbs);
      setFat(foodData.nutrients.fat);
      setFiber(foodData.nutrients.fiber);
      setSugar(foodData.nutrients.sugar);
      setSodium(foodData.nutrients.sodium);
      setCholesterol(foodData.nutrients.cholesterol);
      setAllergens(foodData.allergens || []);
      setTags(foodData.tags || []);
    }
  }, [foodData]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (foodData: Omit<Food, '_id' | 'type' | 'createdAt' | 'updatedAt'>) =>
      foodService.createFood(foodData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      navigate('/foods');
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create food');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (foodData: Food) => foodService.updateFood(foodData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      queryClient.invalidateQueries({ queryKey: ['food', id] });
      navigate('/foods');
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update food');
    }
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!category) {
      setError('Category is required');
      return;
    }

    if (servingSize <= 0) {
      setError('Serving size must be greater than zero');
      return;
    }

    // Validate weight in grams for descriptive units
    if (unitCategories.descriptive.includes(servingUnit) && (!servingWeightGrams || servingWeightGrams <= 0)) {
      setError('Weight in grams is required for descriptive units like small, medium, large, etc.');
      return;
    }

    // Create nutrients object (calories will be calculated in the service)
    const nutrients: NutritionInfo = {
      calories: calculatedCalories, // We include the calculated value for type-safety, but service will recalculate
      protein,
      carbs,
      fat
    };

    // Add optional nutrients if provided
    if (fiber !== undefined && fiber > 0) nutrients.fiber = fiber;
    if (sugar !== undefined && sugar > 0) nutrients.sugar = sugar;
    if (sodium !== undefined && sodium > 0) nutrients.sodium = sodium;
    if (cholesterol !== undefined && cholesterol > 0) nutrients.cholesterol = cholesterol;

    // Create serving info
    const serving: ServingInfo = {
      size: servingSize,
      unit: servingUnit,
      weightInGrams: servingWeightGrams
    };

    // Automatically set weightInGrams to equal serving size if unit is 'g'
    if (servingUnit === 'g' && servingWeightGrams === undefined) {
      serving.weightInGrams = servingSize;
    }

    const finalNutrients = nutrients;

    if (isEditMode && foodData) {
      // Update existing food
      const updatedFood: Food = {
        ...foodData,
        name,
        category,
        nutrients: finalNutrients,
        serving,
        allergens: allergens.length > 0 ? allergens : undefined,
        tags: tags.length > 0 ? tags : undefined,
        updatedAt: new Date().toISOString()
      };
      updateMutation.mutate(updatedFood);
    } else {
      // Create new food
      const newFood = {
        name,
        category,
        nutrients: finalNutrients,
        serving,
        allergens: allergens.length > 0 ? allergens : undefined,
        tags: tags.length > 0 ? tags : undefined
      };
      createMutation.mutate(newFood);
    }
  };

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Add allergen
  const addAllergen = () => {
    if (newAllergen.trim() && !allergens.includes(newAllergen.trim())) {
      setAllergens([...allergens, newAllergen.trim()]);
      setNewAllergen('');
    }
  };

  // Remove allergen
  const removeAllergen = (allergen: string) => {
    setAllergens(allergens.filter(a => a !== allergen));
  };

  // Handle food selection from Nutritionix
  const handleFoodSelect = (foodData: FoodData) => {
    setName(foodData.name);
    setCategory(foodData.category);
    setServingSize(foodData.serving.size);
    setServingUnit(foodData.serving.unit);
    setServingWeightGrams(foodData.serving.weightInGrams);
    setProtein(foodData.nutrients.protein);
    setCarbs(foodData.nutrients.carbs);
    setFat(foodData.nutrients.fat);

    // Set optional nutrients if available
    if (foodData.nutrients.fiber !== undefined) setFiber(foodData.nutrients.fiber);
    if (foodData.nutrients.sugar !== undefined) setSugar(foodData.nutrients.sugar);
    if (foodData.nutrients.sodium !== undefined) setSodium(foodData.nutrients.sodium);
    if (foodData.nutrients.cholesterol !== undefined) setCholesterol(foodData.nutrients.cholesterol);

    // Hide the search after selection
    setShowNutritionixSearch(false);

    // Add food name as a tag if not already present
    if (!tags.includes(foodData.name.toLowerCase())) {
      setTags([...tags, foodData.name.toLowerCase()]);
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div className="card animate-pulse p-8 dark:bg-gray-800">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-4"></div>
      </div>
    );
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-gray-200">
        {isEditMode ? 'Edit Food' : 'Add New Food'}
      </h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Basic Information</h2>

            {showNutritionixSearch && (
              <div className="mb-4 bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-100 dark:border-primary-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-medium text-primary-800 dark:text-primary-300">
                    Search food database
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNutritionixSearch(false)}
                    className="text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
                <p className="text-sm text-primary-600 dark:text-primary-400 mb-3">
                  Search for foods to automatically fill in nutritional information
                </p>
                <FoodSearch onFoodSelect={handleFoodSelect} />
              </div>
            )}

            {!showNutritionixSearch && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowNutritionixSearch(true)}
                  className="btn btn-secondary inline-flex items-center text-sm"
                >
                  <span className="material-symbols-outlined mr-1 text-sm">search</span>
                  Search food database
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="form-label dark:text-gray-300">Name</label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apple"
                  required
                />
              </div>
              <div>
                <Select
                  id="category"
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Serving Information */}
          <div>
            <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Serving Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="servingSize" className="form-label dark:text-gray-300">Serving Size</label>
                <input
                  id="servingSize"
                  type="number"
                  className="form-input"
                  value={servingSize}
                  onChange={(e) => {
                    const value = e.target.value;
                    setServingSize(value === '' ? 0 : parseFloat(value));
                  }}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <Select
                  id="servingUnit"
                  label="Unit"
                  value={servingUnit}
                  onChange={(e) => setServingUnit(e.target.value)}
                  required
                >
                  <optgroup label="Weight">
                    {unitCategories.weight.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Volume">
                    {unitCategories.volume.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Count">
                    {unitCategories.count.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Descriptive">
                    {unitCategories.descriptive.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </optgroup>
                </Select>
              </div>
              {/* Only show weight in grams field if unit is not a weight unit */}
              {!unitCategories.weight.includes(servingUnit) && (
                <div>
                  <label htmlFor="servingWeightGrams" className="form-label dark:text-gray-300">
                    Weight in Grams
                    <span
                      className="ml-1 inline-flex items-center text-gray-500 dark:text-gray-400 cursor-help"
                      title="Equivalent weight in grams for the serving size (useful for nutrition calculations)"
                    >
                      <span className="material-symbols-outlined text-sm">info</span>
                    </span>
                  </label>
                  <input
                    id="servingWeightGrams"
                    type="number"
                    className="form-input"
                    value={servingWeightGrams === undefined ? '' : servingWeightGrams}
                    onChange={(e) =>
                      setServingWeightGrams(e.target.value === '' ? undefined : parseFloat(e.target.value))
                    }
                    min="0"
                    step="0.01"
                    required={unitCategories.descriptive.includes(servingUnit)}
                  />
                  {unitCategories.descriptive.includes(servingUnit) && (
                    <div className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                      Weight in grams is required for descriptive units like small, medium, large, etc.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Nutritional Information */}
          <div>
            <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Nutritional Information (per serving)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="calories" className="form-label dark:text-gray-300">
                  Calories
                  <span
                    className="ml-1 inline-flex items-center text-gray-500 dark:text-gray-400 cursor-help"
                    title="Calculated using 4 cal/g for protein and carbs, 9 cal/g for fat"
                  >
                    <span className="material-symbols-outlined text-sm">info</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="calories"
                    type="text"
                    className="form-input bg-gray-100 dark:bg-gray-700"
                    value={calculatedCalories}
                    readOnly
                    disabled
                    style={{ appearance: 'textfield' }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      Auto-calculated
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="protein" className="form-label dark:text-gray-300">Protein (g)</label>
                <input
                  id="protein"
                  type="number"
                  className="form-input"
                  value={protein}
                  onChange={(e) => {
                    const value = e.target.value;
                    setProtein(value === '' ? 0 : parseFloat(value));
                  }}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label htmlFor="carbs" className="form-label dark:text-gray-300">Carbohydrates (g)</label>
                <input
                  id="carbs"
                  type="number"
                  className="form-input"
                  value={carbs}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCarbs(value === '' ? 0 : parseFloat(value));
                  }}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label htmlFor="fat" className="form-label dark:text-gray-300">Fat (g)</label>
                <input
                  id="fat"
                  type="number"
                  className="form-input"
                  value={fat}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFat(value === '' ? 0 : parseFloat(value));
                  }}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label htmlFor="fiber" className="form-label dark:text-gray-300">Fiber (g, optional)</label>
                <input
                  id="fiber"
                  type="number"
                  className="form-input"
                  value={fiber === undefined ? '' : fiber}
                  onChange={(e) =>
                    setFiber(e.target.value === '' ? undefined : parseFloat(e.target.value))
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label htmlFor="sugar" className="form-label dark:text-gray-300">Sugar (g, optional)</label>
                <input
                  id="sugar"
                  type="number"
                  className="form-input"
                  value={sugar === undefined ? '' : sugar}
                  onChange={(e) =>
                    setSugar(e.target.value === '' ? undefined : parseFloat(e.target.value))
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label htmlFor="sodium" className="form-label dark:text-gray-300">Sodium (mg, optional)</label>
                <input
                  id="sodium"
                  type="number"
                  className="form-input"
                  value={sodium === undefined ? '' : sodium}
                  onChange={(e) =>
                    setSodium(e.target.value === '' ? undefined : parseFloat(e.target.value))
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label htmlFor="cholesterol" className="form-label dark:text-gray-300">Cholesterol (mg, optional)</label>
                <input
                  id="cholesterol"
                  type="number"
                  className="form-input"
                  value={cholesterol === undefined ? '' : cholesterol}
                  onChange={(e) =>
                    setCholesterol(e.target.value === '' ? undefined : parseFloat(e.target.value))
                  }
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Tags</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                className="form-input flex-grow"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={addTag}
                className="ml-2 btn btn-secondary"
              >
                Add
              </button>
            </div>
          </div>

          {/* Allergens */}
          <div>
            <h2 className="text-lg font-medium mb-4 dark:text-gray-200">Allergens</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {allergens.map((allergen) => (
                <span
                  key={allergen}
                  className="inline-flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm"
                >
                  {allergen}
                  <button
                    type="button"
                    onClick={() => removeAllergen(allergen)}
                    className="ml-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                className="form-input flex-grow"
                value={newAllergen}
                onChange={(e) => setNewAllergen(e.target.value)}
                placeholder="Add an allergen"
              />
              <button
                type="button"
                onClick={addAllergen}
                className="ml-2 btn btn-secondary"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/foods')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Saving...
              </>
            ) : (
              'Save Food'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FoodForm;
