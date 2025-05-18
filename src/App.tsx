import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Menu components
import MenusList from './components/Pages/Menus/MenusList';
import MenuDetails from './components/Pages/Menus/MenuDetails';
import MenuForm from './components/Pages/Menus/MenuForm';
import ShoppingList from './components/Pages/Menus/ShoppingList';

// Auth components
import Login from './components/Pages/Auth/Login';
import Signup from './components/Pages/Auth/Signup';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (replaces cacheTime in react-query v5)
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
              {/* Auth Routes - Public */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
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
                    <Route path=":id/shopping-list" element={<ShoppingList />} />
                  </Route>
                  
                  {/* 404 Not Found */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
              
              {/* Catch-all redirect to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </ThemeProvider>
      </DatabaseProvider>
    </QueryClientProvider>
  );
}

export default App
