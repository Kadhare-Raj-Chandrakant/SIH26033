import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => {
        // If the controller already returned the structured format, pass it through
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }
        
        // Otherwise wrap the raw response
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
