import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  
  // Define navigation items
  const navItems = [
    { to: '/', icon: 'dashboard', text: 'Dashboard' },
    { to: '/foods', icon: 'nutrition', text: 'Foods' },
    { to: '/recipes', icon: 'restaurant_menu', text: 'Recipes' },
    { to: '/menus', icon: 'menu_book', text: 'Menus' },
  ];
  
  // Check if path is active
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  
  return (
    <aside className="hidden lg:block w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700">
      <div className="h-full px-3 py-4 overflow-y-auto">
        <ul className="space-y-2 font-medium">
          {navItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group ${
                  isActive(item.to) 
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="material-symbols-outlined">
                  {item.icon}
                </span>
                <span className="ml-3">{item.text}</span>
              </Link>
            </li>
          ))}
        </ul>
        
        <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="px-3 py-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Quick Actions
            </h3>
          </div>
          <ul className="space-y-2 font-medium">
            <li>
              <Link
                to="/foods/new"
                className="flex items-center p-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <span className="material-symbols-outlined">add_circle</span>
                <span className="ml-3">Add Food</span>
              </Link>
            </li>
            <li>
              <Link
                to="/recipes/new"
                className="flex items-center p-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <span className="material-symbols-outlined">add_circle</span>
                <span className="ml-3">Add Recipe</span>
              </Link>
            </li>
            <li>
              <Link
                to="/menus/new"
                className="flex items-center p-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <span className="material-symbols-outlined">add_circle</span>
                <span className="ml-3">Add Menu</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;