import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Structured HTTP operational logger interceptor.
 * Logs method, route, status code, duration, and correlation ID.
 * Excludes request bodies, passwords, JWT tokens, and authorization headers.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const method = req.method;
    const url = req.originalUrl || req.url;
    const requestId = (req as any).id || req.headers['x-request-id'] || 'system';
    const startTime = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Math.round(performance.now() - startTime);
          const statusCode = res.statusCode;
          this.logger.log(`[${requestId}] ${method} ${url} ${statusCode} +${duration}ms`);
        },
        error: (err) => {
          const duration = Math.round(performance.now() - startTime);
          const statusCode = err.status || 500;
          this.logger.error(
            `[${requestId}] ${method} ${url} ${statusCode} +${duration}ms - ${err.message || 'Error'}`,
          );
        },
      }),
    );
  }
}
