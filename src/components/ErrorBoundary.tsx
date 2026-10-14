import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Rendered in place of children once an error has been caught. */
  fallback: ReactNode;
  /** Optional hook — called once with the caught error, e.g. to log or adjust app state. */
  onError?: (error: unknown) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Generic render-phase error boundary. React only supports this via a class
 * component (no hook equivalent) — see componentDidCatch/getDerivedStateFromError.
 *
 * Intentionally silent: no toast, no console noise beyond onError's own logic.
 * Used to isolate optional/decorative subtrees (e.g. WebGL layers) so a failure
 * there can't unmount the rest of the page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export default ErrorBoundary;
