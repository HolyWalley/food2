import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import ViewTransitionsInfo from './ViewTransitionsInfo';
import { useDatabase } from '../../contexts/DatabaseContext';

const Layout = () => {
  const { isLoading } = useDatabase();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="spinner w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Navbar />
      
      <div className="flex flex-grow">
        <Sidebar />
        
        <main className="flex-grow p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      
      <StatusBar />
      <ViewTransitionsInfo />
    </div>
  );
};

export default Layout;