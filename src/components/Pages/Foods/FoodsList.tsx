import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import foodService from '../../../services/foodService';
import db from '../../../services/db';
import { type Food } from '../../../types';
import { withViewTransition } from '../../../utils/viewTransition';
import { Select } from '../../../components/UI';

const FoodsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all foods
  const { data: foods, isLoading, error, refetch } = useQuery({
    queryKey: ['foods'],
    queryFn: foodService.getAllFoods
  });

  // Function to reset database indexes
  const handleResetIndexes = async () => {
    try {
      setIsResetting(true);
      await db.resetIndexes();
      // Invalidate queries to refetch data with new indexes
      await queryClient.invalidateQueries({ queryKey: ['foods'] });
      await refetch();
      alert('Database indexes have been reset successfully. The data should now load correctly.');
    } catch (error) {
      console.error('Error resetting indexes:', error);
      alert(`Error resetting indexes: ${(error as Error).message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Categories for the filter dropdown
  const categories = [
    'All Categories',
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

  // Filter foods based on search term and category
  const filteredFoods = foods?.filter(food => {
    const matchesSearch =
      food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (food.tags && food.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesCategory =
      categoryFilter === '' ||
      categoryFilter === 'All Categories' ||
      food.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle category filter change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
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
        <p className="mb-3">Error loading foods: {(error as Error).message}</p>

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
        <h1 className="text-2xl font-bold mb-4 sm:mb-0 dark:text-gray-200">Foods</h1>
        <Link to="/foods/new" className="btn btn-primary">
          Add New Food
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search foods..."
              className="form-input"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={categoryFilter}
              onChange={handleCategoryChange}
              aria-label="Filter by category"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {filteredFoods?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">No foods found matching your criteria.</p>
          <Link to="/foods/new" className="btn btn-primary">
            Add New Food
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="food-cards-container">
          {filteredFoods?.map(food => (
            <FoodCard key={food._id} food={food} />
          ))}
        </div>
      )}
    </div>
  );
};

// Food card component
const FoodCard = ({ food }: { food: Food }) => {
  const navigate = useNavigate();

  // Handle click with view transition
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await withViewTransition(() => {
      navigate(`/foods/${food._id}`);
    });
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden food-card-hover-effect has-view-transition"
      style={{ viewTransitionName: `food-card-container-${food._id}` }}
    >
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h2
            className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100"
            style={{ viewTransitionName: `food-title-${food._id}` }}
          >
            {food.name}
          </h2>
          <span
            className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded"
            style={{ viewTransitionName: `food-category-${food._id}` }}
          >
            {food.category}
          </span>
        </div>

        <div
          className="mt-4 grid grid-cols-2 gap-2 text-sm"
          style={{ viewTransitionName: `food-nutrients-${food._id}` }}
        >
          <div className="flex flex-col">
            <span className="text-gray-500 dark:text-gray-400">Calories</span>
            <span className="font-medium dark:text-white">{food.nutrients.calories} kcal</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 dark:text-gray-400">Protein</span>
            <span className="font-medium dark:text-white">{food.nutrients.protein}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 dark:text-gray-400">Carbs</span>
            <span className="font-medium dark:text-white">{food.nutrients.carbs}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 dark:text-gray-400">Fat</span>
            <span className="font-medium dark:text-white">{food.nutrients.fat}g</span>
          </div>
        </div>

        <div
          className="mt-4 flex items-center text-sm text-gray-600 dark:text-gray-400"
          style={{ viewTransitionName: `food-serving-${food._id}` }}
        >
          <span>
            Serving: {food.serving.size} {food.serving.unit}
          </span>
        </div>

        {food.tags && food.tags.length > 0 && (
          <div
            className="mt-4 flex flex-wrap gap-1"
            style={{ viewTransitionName: `food-tags-${food._id}` }}
          >
            {food.tags.map(tag => (
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
    </div>
  );
};

export default FoodsList;
