import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import db from '../services/db';

// Define the context interface
interface DatabaseContextType {
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncError: string | null;
  setupSync: (remoteUrl: string) => void;
  stopSync: () => void;
}

// Create the context with a default value
const DatabaseContext = createContext<DatabaseContextType>({
  isLoading: true,
  isOnline: navigator.onLine,
  isSyncing: false,
  syncError: null,
  setupSync: () => {},
  stopSync: () => {}
});

// Create a provider component
export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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
        setSyncError('Failed to initialize database');
        setIsLoading(false);
      }
    };

    initializeDb();
  }, []);

  // Set up remote sync
  const setupSync = (remoteUrl: string) => {
    if (!remoteUrl || !isOnline) {
      setSyncError('Cannot sync: Either remote URL is missing or device is offline');
      return;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);
      
      // Create event listeners for sync events
      const syncEvents = new EventTarget();
      
      syncEvents.addEventListener('change', () => {
        setIsSyncing(true);
      });
      
      syncEvents.addEventListener('complete', () => {
        setIsSyncing(false);
      });
      
      syncEvents.addEventListener('error', (event: Event) => {
        setIsSyncing(false);
        if (event instanceof CustomEvent) {
          setSyncError(event.detail?.message || 'Sync error occurred');
        } else {
          setSyncError('Unknown sync error occurred');
        }
      });
      
      // Set up the sync
      db.setupRemoteSync(remoteUrl);
      
    } catch (error) {
      setIsSyncing(false);
      setSyncError('Failed to set up sync');
      console.error('Sync setup error:', error);
    }
  };

  // Stop syncing
  const stopSync = () => {
    db.stopSync();
    setIsSyncing(false);
  };

  return (
    <DatabaseContext.Provider
      value={{
        isLoading,
        isOnline,
        isSyncing,
        syncError,
        setupSync,
        stopSync
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

// Create a custom hook to use the database context
export const useDatabase = () => useContext(DatabaseContext);

export default DatabaseContext;