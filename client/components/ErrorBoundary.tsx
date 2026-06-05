import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Rocket, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  isUpdating?: boolean;
}

function isDynamicImportFailure(error: Error | undefined) {
  const message = String(error?.message || '').toLowerCase();

  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror')
  );
}

const UpdateScreen = () => {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    // 5 seconds timeout before reload
    const timer = setTimeout(() => {
      // Force a full reload to get the new index.html and fresh chunks
      window.location.href = window.location.href;
    }, 5000);
    
    // Smooth progress bar over 5 seconds
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 2, 100)); // 2% every 100ms = 100% in 5000ms
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: '3s' }}></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: '4s' }}></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: '5s' }}></div>

      <div className="max-w-lg w-full relative z-10">
        <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-xl">
          <div className="h-2 bg-gradient-to-r from-blue-500 via-emerald-400 to-teal-500 w-full animate-pulse"></div>
          <CardContent className="p-10 text-center flex flex-col items-center">
            <div className="relative mb-8 mt-4">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75" style={{ animationDuration: '2s' }}></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-emerald-500 w-24 h-24 rounded-full flex items-center justify-center shadow-xl transform transition-transform hover:scale-105 duration-300">
                <Rocket className="w-12 h-12 text-white animate-bounce" />
              </div>
              <div className="absolute -top-2 -right-2 bg-amber-400 rounded-full p-1.5 shadow-lg animate-spin" style={{ animationDuration: '3s' }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">
              System Update in Progress
            </h2>
            <p className="text-slate-600 text-lg mb-8 leading-relaxed">
              The Score Machine just got some fresh updates! We're preparing your workspace with the latest features and improvements.
            </p>

            <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              Reloading automatically in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (isDynamicImportFailure(error)) {
      this.setState({
        error,
        errorInfo,
        hasError: true,
        isUpdating: true,
      });
      return;
    }

    this.setState({
      error,
      errorInfo,
      isUpdating: false,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, isUpdating: false });
  };

  handleReload = () => {
    window.location.href = window.location.href;
  };

  render() {
    if (this.state.isUpdating) {
      return <UpdateScreen />;
    }

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <Card className="w-full max-w-md shadow-xl border-slate-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-slate-900">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-slate-600">
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Error Details:</h4>
                  <pre className="text-xs text-red-700 whitespace-pre-wrap break-words">
                    {this.state.error.message}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap break-words">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleReset} 
                  variant="outline" 
                  className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleReload} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
