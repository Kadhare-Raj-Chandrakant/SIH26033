import * as Sentry from '@sentry/node';
import { Logger } from '@nestjs/common';

const logger = new Logger('SentryMonitoring');
let isSentryInitialized = false;

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
  'x-internal-api-key',
  'database_url',
  'redis_url',
  'ai_internal_key',
  'cloudinary_api_secret',
]);

/**
 * Strips sensitive fields, authorization tokens, passwords, and secrets
 * recursively from an object to prevent PII / secret leakage into Sentry.
 */
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('password')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeObject(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Initializes Sentry monitoring for the backend if SENTRY_DSN is configured.
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN?.trim();

  if (!dsn) {
    logger.log('Sentry DSN is not configured. Running in local/mock monitoring mode.');
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // Redact sensitive headers
        if (event.request?.headers) {
          event.request.headers = sanitizeObject(event.request.headers);
        }
        // Redact sensitive cookies
        if (event.request?.cookies) {
          event.request.cookies = sanitizeObject(event.request.cookies);
        }
        // Redact any request body / extra context
        if (event.request?.data) {
          event.request.data = sanitizeObject(event.request.data);
        }
        if (event.extra) {
          event.extra = sanitizeObject(event.extra);
        }
        return event;
      },
    });

    isSentryInitialized = true;
    logger.log(`Sentry error monitoring initialized for environment: ${process.env.NODE_ENV || 'development'}`);
    return true;
  } catch (err: any) {
    logger.warn(`Failed to initialize Sentry monitoring: ${err.message}`);
    return false;
  }
}

/**
 * Captures an unhandled or critical operational error in Sentry with correlation metadata.
 */
export function captureOperationalException(
  exception: unknown,
  context?: {
    requestId?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    errorType?: string;
    extra?: Record<string, any>;
  },
): void {
  if (!isSentryInitialized) {
    return;
  }

  try {
    Sentry.withScope((scope) => {
      if (context?.requestId) {
        scope.setTag('requestId', context.requestId);
      }
      if (context?.path) {
        scope.setTag('path', context.path);
      }
      if (context?.method) {
        scope.setTag('method', context.method);
      }
      if (context?.statusCode) {
        scope.setTag('statusCode', String(context.statusCode));
      }
      if (context?.errorType) {
        scope.setTag('errorType', context.errorType);
      }
      if (context?.extra) {
        scope.setExtras(sanitizeObject(context.extra));
      }

      Sentry.captureException(exception);
    });
  } catch (err: any) {
    logger.warn(`Failed to forward exception to Sentry: ${err.message}`);
  }
}

export function isSentryActive(): boolean {
  return isSentryInitialized;
}
