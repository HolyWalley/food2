import { createContext } from 'react';

// Import sync result type
import type { SyncResult } from '../utils/syncUtils';

// Define the context interface
export interface DatabaseContextType {
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncError: string | null;
  lastSync: Date | null;
  syncNow: () => Promise<SyncResult>;
  pullChanges: () => Promise<SyncResult>;
  pushChanges: () => Promise<SyncResult>;
  
  // Keep old methods for backwards compatibility
  setupSync: (remoteUrl: string) => void;
  stopSync: () => void;
}

// Create the context with a default value
export const DatabaseContext = createContext<DatabaseContextType>({
  isLoading: true,
  isOnline: navigator.onLine,
  isSyncing: false,
  syncError: null,
  lastSync: null,
  syncNow: async () => ({ success: false, error: 'Not implemented' }),
  pullChanges: async () => ({ success: false, error: 'Not implemented' }),
  pushChanges: async () => ({ success: false, error: 'Not implemented' }),
  setupSync: () => {},
  stopSync: () => {}
});