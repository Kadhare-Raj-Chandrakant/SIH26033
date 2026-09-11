import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errorType = 'InternalError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' && 'message' in res ? (res as any).message : res;
      errorType = exception.name;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors cleanly (e.g. Unique constraint failed)
      status = HttpStatus.CONFLICT;
      message = 'Database constraint violation';
      errorType = 'PrismaError';
      // We don't expose the exact DB error string to the user for security.
      this.logger.error(`Prisma error ${exception.code} on ${request.url}: ${exception.message}`);
    } else if (exception instanceof Error) {
      errorType = exception.name;
      this.logger.error(`Unhandled error on ${request.url}: ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`Unknown exception on ${request.url}`, String(exception));
    }

    response.status(status).json({
      success: false,
      error: {
        type: errorType,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
