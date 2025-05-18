import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import db from '../services/db';
import { DatabaseContext } from './databaseContextDefinition';

// Create a provider component
export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize the database
  useEffect(() => {
    const initializeDb = async () => {
      try {
        await db.getInfo();
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setIsLoading(false);
      }
    };

    initializeDb();
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        isLoading,
        isOnline,
        isSyncing: false,
        syncError: null,
        setupSync: () => {}, // Placeholder, will be implemented later
        stopSync: () => {}   // Placeholder, will be implemented later
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

// The useDatabase hook is now in a separate file
export { DatabaseContext } from './databaseContextDefinition';