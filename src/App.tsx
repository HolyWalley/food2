import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Context Providers
import { DatabaseProvider } from './contexts/DatabaseContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layout Components
import Layout from './components/Layout/Layout';

// Page Components
import Dashboard from './components/Pages/Dashboard';
import FoodsList from './components/Pages/Foods/FoodsList';
import FoodDetails from './components/Pages/Foods/FoodDetails';
import FoodForm from './components/Pages/Foods/FoodForm';
import NotFound from './components/Pages/NotFound';

// Recipe components
import RecipesList from './components/Pages/Recipes/RecipesList';
import RecipeDetails from './components/Pages/Recipes/RecipeDetails';
import RecipeForm from './components/Pages/Recipes/RecipeForm';
const MenusList = () => <div className="p-4"><h1 className="text-2xl font-bold">Menus List</h1><p className="mt-2 text-gray-600">This feature is coming soon!</p></div>;
const MenuDetails = () => <div className="p-4"><h1 className="text-2xl font-bold">Menu Details</h1><p className="mt-2 text-gray-600">This feature is coming soon!</p></div>;
const MenuForm = () => <div className="p-4"><h1 className="text-2xl font-bold">Menu Form</h1><p className="mt-2 text-gray-600">This feature is coming soon!</p></div>;

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseProvider>
        <ThemeProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
              {/* Dashboard */}
              <Route index element={<Dashboard />} />
              
              {/* Food Routes */}
              <Route path="foods">
                <Route index element={<FoodsList />} />
                <Route path="new" element={<FoodForm />} />
                <Route path=":id" element={<FoodDetails />} />
                <Route path=":id/edit" element={<FoodForm />} />
              </Route>
              
              {/* Recipe Routes */}
              <Route path="recipes">
                <Route index element={<RecipesList />} />
                <Route path="new" element={<RecipeForm />} />
                <Route path=":id" element={<RecipeDetails />} />
                <Route path=":id/edit" element={<RecipeForm />} />
              </Route>
              
              {/* Menu Routes */}
              <Route path="menus">
                <Route index element={<MenusList />} />
                <Route path="new" element={<MenuForm />} />
                <Route path=":id" element={<MenuDetails />} />
                <Route path=":id/edit" element={<MenuForm />} />
              </Route>
              
              {/* 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </Router>
        </ThemeProvider>
      </DatabaseProvider>
    </QueryClientProvider>
  );
}

export default App
