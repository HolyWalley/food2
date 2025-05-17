import { useContext } from 'react';
import { DatabaseContext } from '../contexts/databaseContextDefinition';

export const useDatabase = () => useContext(DatabaseContext);