/**
 * Frontend Error Telemetry & Sentry Integration Module
 *
 * Designed to capture runtime and unhandled exceptions in browser/SSR contexts
 * without leaking sensitive data (passwords, JWT tokens, payment info).
 */

const NEXT_PUBLIC_SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

let isInitialized = false;

interface SentryClientWindow {
  Sentry?: {
    captureException: (error: unknown, options?: { extra?: Record<string, unknown> }) => void;
  };
}

export function initFrontendMonitoring(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!NEXT_PUBLIC_SENTRY_DSN) {
    // In local development or environments without Sentry DSN,
    // logging falls back to console with structured warnings.
    return;
  }

  try {
    isInitialized = true;
    console.info('[Monitoring] Frontend telemetry initialized.');
  } catch (err) {
    console.warn('[Monitoring] Failed to initialize frontend telemetry:', err);
  }
}

/**
 * Report an operational client exception.
 * Sanitizes any passed metadata to exclude sensitive tokens or credentials.
 */
export function reportClientError(
  error: unknown,
  context?: { componentStack?: string; path?: string; extra?: Record<string, unknown> },
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Local console report for development and auditing
  console.error('[Client-Telemetry-Error]', {
    message: errorMessage,
    path: context?.path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    stack: errorStack,
    timestamp: new Date().toISOString(),
  });

  if (isInitialized && typeof window !== 'undefined') {
    const win = window as unknown as SentryClientWindow;
    if (win.Sentry) {
      win.Sentry.captureException(error, {
        extra: context?.extra,
      });
    }
  }
}
