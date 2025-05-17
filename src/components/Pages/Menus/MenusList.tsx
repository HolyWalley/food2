import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import menuService from '../../../services/menuService';
import db from '../../../services/db';
import { type Menu } from '../../../types';
import { withViewTransition } from '../../../utils/viewTransition';

const MenusList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all menus
  const { data: menus, isLoading, error, refetch } = useQuery({
    queryKey: ['menus'],
    queryFn: menuService.getAllMenus
  });
  
  // Function to reset database indexes
  const handleResetIndexes = async () => {
    try {
      setIsResetting(true);
      await db.resetIndexes();
      // Invalidate queries to refetch data with new indexes
      await queryClient.invalidateQueries({ queryKey: ['menus'] });
      await refetch();
      alert('Database indexes have been reset successfully. The data should now load correctly.');
    } catch (error) {
      console.error('Error resetting indexes:', error);
      alert(`Error resetting indexes: ${(error as Error).message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Filter menus based on search term
  const filteredMenus = menus?.filter(menu => {
    const matchesSearch =
      menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      menu.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (menu.tags && menu.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

    return matchesSearch;
  });

  // Sort menus by creation date (newest first)
  const sortedMenus = filteredMenus?.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };


  // Render loading state
  if (isLoading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
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
        <p className="mb-3">Error loading menus: {(error as Error).message}</p>
        
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
        <h1 className="text-2xl font-bold mb-4 sm:mb-0 dark:text-gray-200">Menus</h1>
        <Link to="/menus/new" className="btn btn-primary">
          Create New Menu
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search menus..."
              className="form-input"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>
      </div>

      {!sortedMenus || sortedMenus.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">No menus found matching your criteria.</p>
          <Link to="/menus/new" className="btn btn-primary">
            Create New Menu
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="menu-cards-container">
          {sortedMenus.map(menu => (
            <MenuCard key={menu._id} menu={menu} />
          ))}
        </div>
      )}
    </div>
  );
};

// Menu card component
const MenuCard = ({ menu }: { menu: Menu }) => {
  const navigate = useNavigate();
  
  // Handle click with view transition
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await withViewTransition(() => {
      navigate(`/menus/${menu._id}`);
    }, 'menu-to-details');
  };
  

  return (
    <Link
      to={`/menus/${menu._id}`}
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden food-card-hover-effect has-view-transition"
      style={{ viewTransitionName: `menu-card-container-${menu._id}` }}
    >
      <div className="p-6">
        <h2 
          className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100"
          style={{ viewTransitionName: `menu-title-${menu._id}` }}
        >
          {menu.name}
        </h2>

        <p 
          className="text-gray-600 dark:text-gray-400 mb-4 text-sm"
          style={{ viewTransitionName: `menu-description-${menu._id}` }}
        >
          {menu.description}
        </p>

        <div style={{ viewTransitionName: `menu-items-${menu._id}` }}>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span className="material-symbols-outlined text-sm mr-1">restaurant_menu</span>
            <span>{menu.items.length} items</span>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="material-symbols-outlined text-sm mr-1">update</span>
            <span>Updated: {new Date(menu.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {menu.tags && menu.tags.length > 0 && (
          <div 
            className="mt-4 flex flex-wrap gap-1"
            style={{ viewTransitionName: `menu-tags-${menu._id}` }}
          >
            {menu.tags.map(tag => (
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
    </Link>
  );
};

export default MenusList;