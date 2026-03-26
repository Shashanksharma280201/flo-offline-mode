import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex h-screen w-full items-center justify-center bg-backgroundGray">
                    <div className="max-w-2xl rounded-lg border border-red-800 bg-gray-800 p-8 text-white">
                        <h1 className="mb-4 text-2xl font-bold text-red-500">
                            Something went wrong
                        </h1>
                        <p className="mb-4 text-gray-300">
                            The dashboard encountered an error. Please try
                            refreshing the page.
                        </p>
                        <details className="mb-4 cursor-pointer rounded bg-gray-900 p-4">
                            <summary className="font-semibold">
                                Error Details
                            </summary>
                            <pre className="mt-2 overflow-auto text-xs text-red-400">
                                {this.state.error?.toString()}
                                {"\n\n"}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded bg-blue-600 px-6 py-2 font-semibold hover:bg-blue-700"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
