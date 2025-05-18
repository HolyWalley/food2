import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import db from '../services/db';
import { DatabaseContext } from './databaseContextDefinition';
import { syncDatabase, pullChanges as pullDbChanges, pushChanges as pushDbChanges, setupSyncHooks } from '../utils/syncUtils';
import useAuth from '../hooks/useAuth';

// Create a provider component
export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

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

  // Initialize the database and set up sync hooks
  useEffect(() => {
    const initializeDb = async () => {
      try {
        await db.getInfo();
        
        // Set up sync hooks that will automatically push changes 
        // after mutations (put, remove) if the user is authenticated
        if (user) {
          setupSyncHooks(db, () => user);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setIsLoading(false);
      }
    };

    initializeDb();
  }, [user]);

  // Sync operations
  const syncNow = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!isOnline) {
      return { success: false, error: 'Device is offline' };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Perform two-way sync
      const result = await syncDatabase(user, 'both');
      
      if (result.success) {
        setLastSync(new Date());
      } else {
        setSyncError(result.error || 'Unknown error during sync');
      }

      setIsSyncing(false);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(errorMessage);
      setIsSyncing(false);
      return { success: false, error: errorMessage };
    }
  }, [user, isOnline]);

  // Pull remote changes
  const pullChanges = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!isOnline) {
      return { success: false, error: 'Device is offline' };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Pull changes from remote
      const result = await pullDbChanges(user);
      
      if (result.success) {
        setLastSync(new Date());
      } else {
        setSyncError(result.error || 'Unknown error during pull');
      }

      setIsSyncing(false);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(errorMessage);
      setIsSyncing(false);
      return { success: false, error: errorMessage };
    }
  }, [user, isOnline]);

  // Push local changes
  const pushChanges = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!isOnline) {
      return { success: false, error: 'Device is offline' };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Push changes to remote
      const result = await pushDbChanges(user);
      
      if (result.success) {
        setLastSync(new Date());
      } else {
        setSyncError(result.error || 'Unknown error during push');
      }

      setIsSyncing(false);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(errorMessage);
      setIsSyncing(false);
      return { success: false, error: errorMessage };
    }
  }, [user, isOnline]);

  // Legacy methods (for backward compatibility)
  const setupSync = useCallback(() => {
    console.warn('setupSync is deprecated, use syncNow, pullChanges, or pushChanges instead');
  }, []);

  const stopSync = useCallback(() => {
    console.warn('stopSync is deprecated, sync operations are now one-time operations');
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        isLoading,
        isOnline,
        isSyncing,
        syncError,
        lastSync,
        syncNow,
        pullChanges,
        pushChanges,
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