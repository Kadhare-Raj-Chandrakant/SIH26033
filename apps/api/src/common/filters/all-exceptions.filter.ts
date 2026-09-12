import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { captureOperationalException } from '../monitoring/sentry.util.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request as any)?.id ||
      (typeof request.headers['x-request-id'] === 'string' ? request.headers['x-request-id'] : undefined) ||
      'unknown';

    // Ensure x-request-id header is reflected in error responses
    if (typeof response.setHeader === 'function' && !response.getHeader('x-request-id')) {
      response.setHeader('x-request-id', requestId);
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errorType = 'InternalError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' && res !== null && 'message' in res ? (res as any).message : res;
      errorType = exception.name;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      errorType = 'DatabaseError';
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A resource with this identifier already exists';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'The requested resource was not found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Referenced entity does not exist or has active constraints';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'Database request could not be processed';
          break;
      }
      this.logger.error(`[${requestId}] Prisma known error ${exception.code} on ${request.url}: ${exception.message}`);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Database query validation failed';
      errorType = 'DatabaseValidationError';
      this.logger.error(`[${requestId}] Prisma validation error on ${request.url}: ${exception.message}`);
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected internal error occurred';
      errorType = 'InternalServerError';
      this.logger.error(`[${requestId}] Unhandled error on ${request.url}: ${exception.message}`, exception.stack);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      errorType = 'UnknownError';
      this.logger.error(`[${requestId}] Unknown exception on ${request.url}`, String(exception));
    }

    // Capture unhandled operational errors (500+) in Sentry
    if (status >= 500) {
      captureOperationalException(exception, {
        requestId,
        path: request.url,
        method: request.method,
        statusCode: status,
        errorType,
      });
    }

    response.status(status).json({
      success: false,
      error: {
        type: errorType,
        message,
        path: request.url,
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
