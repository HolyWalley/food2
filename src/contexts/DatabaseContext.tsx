import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import db from '../services/db';
import { DatabaseContext } from './databaseContextDefinition';

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

// The useDatabase hook is now in a separate file
export { DatabaseContext } from './databaseContextDefinition';