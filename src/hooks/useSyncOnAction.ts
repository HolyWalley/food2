import { useEffect, useCallback } from 'react';
import { useDatabase } from './useDatabase';
import useAuth from './useAuth';
import type { SyncOperation } from '../utils/syncUtils';

/**
 * Hook that provides functions to sync data based on different triggers
 * 
 * @param dependencies Optional array of dependencies that will trigger a sync when changed
 * @param syncType Type of sync to perform ('push', 'pull', or 'both')
 * @param silent Whether to show loading indicators and errors
 * @returns Object with sync functions
 */
export default function useSyncOnAction(
  dependencies: any[] = [],
  syncType: SyncOperation = 'pull',
  silent: boolean = false
) {
  const { syncNow, pullChanges, pushChanges, isOnline } = useDatabase();
  const { isAuthenticated, user } = useAuth();

  // Function to perform the appropriate sync based on syncType
  const performSync = useCallback(async () => {
    if (!isAuthenticated || !isOnline) {
      return { success: false };
    }

    try {
      switch (syncType) {
        case 'push':
          return await pushChanges();
        case 'pull':
          return await pullChanges();
        case 'both':
          return await syncNow();
        default:
          return { success: false, error: 'Invalid sync type' };
      }
    } catch (error) {
      console.error('Error during sync:', error);
      return { success: false, error: String(error) };
    }
  }, [isAuthenticated, isOnline, syncType, syncNow, pullChanges, pushChanges]);

  // Function to sync after specific actions (can be called manually)
  const syncAfterAction = useCallback(async () => {
    // Skip if not authenticated or offline
    if (!isAuthenticated || !isOnline) {
      return { success: false };
    }

    return performSync();
  }, [isAuthenticated, isOnline, performSync]);

  // Automatically sync when dependencies change
  useEffect(() => {
    // Skip if conditions aren't met
    if (!isAuthenticated || !isOnline || !user) {
      return;
    }

    // Perform the sync in background
    const syncPromise = performSync();
    
    // If not silent, log the result
    if (!silent) {
      syncPromise
        .then(result => {
          if (result.success) {
            // Log success details (count of changes pulled/pushed)
            if (result.pullCount || result.pushCount) {
              const counts = [];
              if (result.pullCount) counts.push(`pulled ${result.pullCount}`);
              if (result.pushCount) counts.push(`pushed ${result.pushCount}`);
              console.log(`Sync successful: ${counts.join(', ')}`);
            } else {
              console.log('Sync successful: no changes');
            }
          } else {
            console.warn('Sync failed:', result.error);
          }
        })
        .catch(error => {
          console.error('Error during automatic sync:', error);
        });
    }
  }, [...dependencies, isAuthenticated, isOnline, user, performSync, silent]);

  return {
    syncNow: performSync,
    syncAfterAction,
  };
}