import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <div className="text-6xl font-bold text-primary-600 dark:text-primary-400 mb-4">404</div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Page Not Found</h1>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
        The page you are looking for might have been removed, had its name changed,
        or is temporarily unavailable.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;