import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import foodService from '../../../services/foodService';
import { Food } from '../../../types';

const FoodsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fetch all foods
  const { data: foods, isLoading, error } = useQuery({
    queryKey: ['foods'],
    queryFn: foodService.getAllFoods
  });

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
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading foods: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0">Foods</h1>
        <Link to="/foods/new" className="btn btn-primary">
          Add New Food
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
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
            <select
              className="form-input"
              value={categoryFilter}
              onChange={handleCategoryChange}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredFoods?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No foods found matching your criteria.</p>
          <Link to="/foods/new" className="btn btn-primary mt-4">
            Add New Food
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
  return (
    <Link 
      to={`/foods/${food._id}`}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">{food.name}</h2>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
            {food.category}
          </span>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="text-gray-500">Calories</span>
            <span className="font-medium">{food.nutrients.calories} kcal</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Protein</span>
            <span className="font-medium">{food.nutrients.protein}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Carbs</span>
            <span className="font-medium">{food.nutrients.carbs}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Fat</span>
            <span className="font-medium">{food.nutrients.fat}g</span>
          </div>
        </div>
        
        <div className="mt-4 flex items-center text-sm text-gray-600">
          <span>
            Serving: {food.serving.size} {food.serving.unit}
          </span>
        </div>
        
        {food.tags && food.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {food.tags.map(tag => (
              <span 
                key={tag} 
                className="inline-block bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export default FoodsList;