import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, error } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setFormError('Username and password are required');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    
    try {
      await login(username, password);
      navigate('/'); // Redirect to root instead of /dashboard
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-md w-full space-y-8 p-10 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
        
        {(formError || error) && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-4">
            <div className="text-sm text-red-700 dark:text-red-400">
              {formError || error}
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} autoComplete="on" name="login" method="post">
          <input type="hidden" name="form-type" value="login" />
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="form-label">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className="form-input"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="current-password" className="form-label">Password</label>
              <input
                id="current-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="form-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div className="text-sm text-center">
            <Link to="/signup" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300">
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;