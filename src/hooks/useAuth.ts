import { useContext } from 'react';
import AuthContext from '../contexts/authContextDefinition';

/**
 * Custom hook for accessing authentication context
 * @returns The authentication context
 */
export default function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}