import { useState, useEffect } from 'react';
import { supportsViewTransitions } from '../../utils/viewTransition';

const ViewTransitionsInfo = () => {
  const [showMessage, setShowMessage] = useState(false);
  useEffect(() => {
    // Check if the browser supports View Transitions API
    const supported = supportsViewTransitions();
    setShowMessage(!supported);

    // Hide the message after 10 seconds
    if (!supported) {
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-xs z-50 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <span className="material-symbols-outlined text-yellow-500 mr-2">info</span>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">View Transitions</h3>
        </div>
        <button 
          onClick={() => setShowMessage(false)}
          className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        Your browser doesn't support the View Transitions API. 
        Animations between pages will use fallback navigation.
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
        For best experience, try using Chrome 111+ or other Chromium browsers.
      </p>
    </div>
  );
};

export default ViewTransitionsInfo;