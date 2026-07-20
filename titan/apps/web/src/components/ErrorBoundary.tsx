import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "@titan/design-system";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Injected rather than hardcoded to a specific error-reporting SDK — no
   * error-reporting provider has been chosen yet (see ARCHITECTURE.md open
   * decisions). Defaults to console.error so nothing is silently swallowed
   * in the meantime. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    (this.props.onError ?? defaultOnError)(error, info);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error) {
      return (
        <div role="alert" style={{ padding: 32, textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. You can try again, or reload the page.</p>
          <Button onClick={this.handleReset}>Try again</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function defaultOnError(error: Error, info: ErrorInfo) {
  // Intentional fallback until a real error-reporting provider is chosen (ARCHITECTURE.md).
  console.error("Unhandled error caught by ErrorBoundary:", error, info.componentStack);
}
