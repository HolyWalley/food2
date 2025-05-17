import { createContext } from 'react';

// Define the context interface
export interface DatabaseContextType {
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncError: string | null;
  setupSync: (remoteUrl: string) => void;
  stopSync: () => void;
}

// Create the context with a default value
export const DatabaseContext = createContext<DatabaseContextType>({
  isLoading: true,
  isOnline: navigator.onLine,
  isSyncing: false,
  syncError: null,
  setupSync: () => {},
  stopSync: () => {}
});