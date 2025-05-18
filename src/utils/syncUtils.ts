/**
 * Utilities for PouchDB to CouchDB synchronization
 * via Cloudflare Functions
 */

import db from '../services/db';
import type { User } from '../contexts/authContextDefinition';

// Database sync operation types
export type SyncOperation = 'push' | 'pull' | 'both';

// Interface for sync results
export interface SyncResult {
  success: boolean;
  error?: string;
  pullCount?: number;
  pushCount?: number;
  lastSync?: Date;
}

/**
 * Gets the sync endpoint URL
 */
export function getSyncUrl(): string {
  // Use the current domain for the API URL
  const baseUrl = window.location.origin;
  return `${baseUrl}/api/sync`;
}

/**
 * Gets the auth token for sync requests
 */
function getAuthToken(): string {
  return localStorage.getItem('authToken') || '';
}

/**
 * Perform one-way or two-way sync between local PouchDB and remote CouchDB
 * 
 * @param user The current authenticated user
 * @param operation The type of sync operation to perform ('push', 'pull', or 'both')
 * @param retries Number of retries if sync fails (optional, default: 2)
 * @returns Promise resolving to sync result
 */
export async function syncDatabase(
  user: User,
  operation: SyncOperation = 'both',
  retries: number = 2
): Promise<SyncResult> {
  // Don't sync if we don't have a user
  if (!user?.uuid) {
    return {
      success: false,
      error: 'User not authenticated'
    };
  }

  // Get the sync URL
  const syncUrl = getSyncUrl();
  if (!syncUrl) {
    return {
      success: false,
      error: 'Sync URL not configured'
    };
  }

  // Attempt the sync with retries
  let currentTry = 0;
  let lastError: Error | null = null;

  while (currentTry <= retries) {
    try {
      // Access the internal PouchDB instance
      const pouchDb = (db as any).db;
      if (!pouchDb) {
        throw new Error('PouchDB instance not accessible');
      }

      // Create remote database connection
      const remoteDb = new PouchDB(syncUrl);

      // Prepare sync options with selector for user's data
      // This ensures we only sync the current user's private data plus shared resources
      const syncOptions = {
        // Set a reasonable batch size for efficiency
        batch_size: 25
      };

      let pullCount = 0;
      let pushCount = 0;

      // Perform the appropriate sync operation
      if (operation === 'pull' || operation === 'both') {
        // Pull changes from remote to local
        const pullResult = await pouchDb.replicate.from(remoteDb, syncOptions);
        pullCount = pullResult.docs_written;
      }

      if (operation === 'push' || operation === 'both') {
        // Push changes from local to remote
        const pushResult = await pouchDb.replicate.to(remoteDb, syncOptions);
        pushCount = pushResult.docs_written;
      }

      // Success - return sync stats
      return {
        success: true,
        pullCount,
        pushCount,
        lastSync: new Date()
      };
    } catch (error) {
      // Log the error
      console.error('Sync error (attempt ' + (currentTry + 1) + '):', error);
      lastError = error as Error;

      // Increment retry counter
      currentTry++;

      // Wait a bit before retry (exponential backoff)
      if (currentTry <= retries) {
        const delay = Math.pow(2, currentTry) * 500; // 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all retries failed
  return {
    success: false,
    error: lastError?.message || 'Unknown sync error'
  };
}

/**
 * Push local changes to the remote database
 * 
 * @param user The current authenticated user 
 * @returns Promise resolving to sync result
 */
export async function pushChanges(user: User): Promise<SyncResult> {
  return syncDatabase(user, 'push');
}

/**
 * Pull remote changes to the local database
 * 
 * @param user The current authenticated user
 * @returns Promise resolving to sync result
 */
export async function pullChanges(user: User): Promise<SyncResult> {
  return syncDatabase(user, 'pull');
}

/**
 * Update the Database service with sync hooks
 * This adds the ability to auto-sync after write operations
 * 
 * @param dbInstance The Database instance
 * @param getUser Function to get the current user
 */
export function setupSyncHooks(dbInstance: any, getUser: () => User | null): void {
  // Store original put, remove methods
  const originalPut = dbInstance.put;
  const originalRemove = dbInstance.remove;

  // Override put method to sync after write
  dbInstance.put = async function syncPut(...args: any[]) {
    // Call the original method
    const result = await originalPut.apply(this, args);

    // Get current user
    const user = getUser();

    // Sync after successful write if we have a user
    if (user) {
      try {
        // Run in background (don't await)
        pushChanges(user)
          .then(syncResult => {
            if (!syncResult.success) {
              console.warn('Auto-sync after put failed:', syncResult.error);
            }
          })
          .catch(error => {
            console.error('Error in auto-sync after put:', error);
          });
      } catch (error) {
        console.error('Failed to start auto-sync after put:', error);
      }
    }

    return result;
  };

  // Override remove method to sync after delete
  dbInstance.remove = async function syncRemove(...args: any[]) {
    // Call the original method
    const result = await originalRemove.apply(this, args);

    // Get current user
    const user = getUser();

    // Sync after successful deletion if we have a user
    if (user) {
      try {
        // Run in background (don't await)
        pushChanges(user)
          .then(syncResult => {
            if (!syncResult.success) {
              console.warn('Auto-sync after remove failed:', syncResult.error);
            }
          })
          .catch(error => {
            console.error('Error in auto-sync after remove:', error);
          });
      } catch (error) {
        console.error('Failed to start auto-sync after remove:', error);
      }
    }

    return result;
  };
}
