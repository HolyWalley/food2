import { useDatabase } from '../../contexts/DatabaseContext';

const StatusBar = () => {
  const { isOnline, isSyncing, syncError } = useDatabase();

  return (
    <footer className="bg-white border-t border-gray-200 py-2 px-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span 
              className={`inline-block w-3 h-3 rounded-full mr-2 ${
                isOnline ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></span>
            <span className="text-sm text-gray-600">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {isSyncing && (
            <div className="flex items-center text-sm text-blue-600">
              <svg 
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                ></circle>
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Syncing...
            </div>
          )}
          
          {syncError && (
            <div className="text-sm text-red-600">
              Sync Error: {syncError}
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          Food Planning App v0.1.0
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;