import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // You can send the error to a logging service here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>เกิดข้อผิดพลาด</h2>
          <p>ขออภัย แต่เกิดข้อผิดพลาดในการแสดงหน้านี้</p>
          <button
            onClick={() => window.location.reload()}
            className="guts-fv-primary"
          >
            โหลดใหม่
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
