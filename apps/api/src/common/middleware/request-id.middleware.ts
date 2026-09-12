import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Express middleware to propagate or generate correlation/request IDs.
 * Inspects incoming 'x-request-id' header. If absent or malformed,
 * generates a cryptographically random UUID.
 *
 * Attaches the ID to:
 * - req.headers['x-request-id']
 * - (req as any).id
 * - res.setHeader('x-request-id', id)
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'];

  // Only accept clean alphanumeric and hyphen/underscore identifiers up to 64 chars
  const isValidIncoming =
    typeof incomingId === 'string' &&
    incomingId.length > 0 &&
    incomingId.length <= 64 &&
    /^[a-zA-Z0-9_-]+$/.test(incomingId);

  const correlationId = isValidIncoming ? incomingId : randomUUID();

  (req as any).id = correlationId;
  req.headers['x-request-id'] = correlationId;
  res.setHeader('x-request-id', correlationId);

  next();
}
