import { Component } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <ExclamationCircleIcon className="w-16 h-16 text-red-300 mb-4" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-6 max-w-md">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                       py-2.5 px-6 rounded-xl transition-colors text-sm"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
