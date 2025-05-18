import { useContext } from 'react';
import { DatabaseContext } from '../contexts/databaseContextDefinition';

// Export as both default and named export for compatibility
export const useDatabase = () => useContext(DatabaseContext);
export default useDatabase;