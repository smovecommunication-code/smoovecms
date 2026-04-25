export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  scope: string;
  event: string;
  details?: Record<string, unknown>;
  error?: unknown;
}

const isDev = import.meta.env.DEV;

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { value: error };
}

function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;

  const sanitized = { ...details };
  for (const key of Object.keys(sanitized)) {
    if (/password|token|authorization|cookie|secret/i.test(key)) {
      sanitized[key] = '[redacted]';
    }
  }

  return sanitized;
}

function emit(level: LogLevel, context: LogContext): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    scope: context.scope,
    event: context.event,
    details: sanitizeDetails(context.details),
    error: context.error ? serializeError(context.error) : undefined,
  };

  if (!isDev && level === 'debug') {
    return;
  }

  const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  logger(`[app:${context.scope}] ${context.event}`, payload);
}

export function logDebug(context: LogContext): void {
  emit('debug', context);
}

export function logInfo(context: LogContext): void {
  emit('info', context);
}

export function logWarn(context: LogContext): void {
  emit('warn', context);
}

export function logError(context: LogContext): void {
  emit('error', context);
}
