import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function NotFoundPage() {
  usePageTitle('Page not found');

  return (
    <div className="not-found">
      <span className="not-found-code">404</span>
      <h1>Page not found</h1>
      <p>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
