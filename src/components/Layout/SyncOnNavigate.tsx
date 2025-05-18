import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useDatabase from '../../hooks/useDatabase';
import useAuth from '../../hooks/useAuth';

/**
 * Component that triggers data sync when navigation occurs
 * This works by detecting route changes and pulling changes from the remote database
 */
export default function SyncOnNavigate() {
  const location = useLocation();
  const { pullChanges, isOnline } = useDatabase();
  const { isAuthenticated } = useAuth();
  
  // Pull changes when navigation occurs (route changes)
  useEffect(() => {
    // Only sync if we're online and authenticated
    if (isOnline && isAuthenticated) {
      console.log('Navigation detected, pulling changes from remote...');
      
      // Pull changes without waiting (run in background)
      pullChanges()
        .then(result => {
          if (result.success) {
            if (result.pullCount && result.pullCount > 0) {
              console.log(`Sync successful: pulled ${result.pullCount} changes`);
            } else {
              console.log('Sync successful: no changes to pull');
            }
          } else {
            console.warn('Sync failed:', result.error);
          }
        })
        .catch(error => {
          console.error('Error during navigation sync:', error);
        });
    }
  }, [location.pathname, isOnline, isAuthenticated, pullChanges]);
  
  // This component doesn't render anything
  return null;
}