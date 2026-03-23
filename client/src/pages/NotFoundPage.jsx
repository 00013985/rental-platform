import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <ExclamationTriangleIcon className="w-16 h-16 text-gray-300 mb-4" />
      <h1 className="text-5xl font-extrabold text-gray-900 mb-2">404</h1>
      <p className="text-lg text-gray-500 mb-6">
        Oops — we couldn't find that page.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white
                   font-semibold py-2.5 px-6 rounded-xl transition-colors text-sm"
      >
        ← Back to home
      </Link>
    </div>
  );
}
