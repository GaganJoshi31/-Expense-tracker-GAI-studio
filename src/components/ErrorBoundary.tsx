import React, { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Switched to class property for state initialization. This is a more modern approach and avoids potential 'this' context issues within a constructor that may have been causing the build errors.
  public state: State = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-2xl max-w-2xl w-full text-left">
                {/* FIX: Changed dark:bg-red-400 to dark:text-red-400 for correct text coloring in dark mode. */}
                <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Oops! Something went wrong.</h1>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                    The application encountered a critical error and had to stop. Please try refreshing the page. If the problem persists, contact support.
                </p>
                <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-md overflow-auto max-h-80">
                    <h2 className="text-lg font-semibold mb-2">Error Details:</h2>
                    <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono">
                        {this.state.error?.toString()}
                        {this.state.errorInfo?.componentStack}
                    </pre>
                </div>
                 <div className="mt-6 text-center">
                     <button
                        onClick={() => window.location.reload()}
                        className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
