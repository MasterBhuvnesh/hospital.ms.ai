export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any,
  ) {
    super(message)
  }
}

export const badRequest = (m = 'Bad request', details?: any) => new AppError(400, 'BAD_REQUEST', m, details)
export const validationError = (details: any) => new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details)
export const unauthorized = (m = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', m)
export const forbidden = (m = 'Forbidden') => new AppError(403, 'FORBIDDEN', m)
export const notFound = (m = 'Not found') => new AppError(404, 'NOT_FOUND', m)
export const methodNotAllowed = () => new AppError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
export const conflict = (m = 'Conflict') => new AppError(409, 'CONFLICT', m)
export const gone = (m = 'Gone') => new AppError(410, 'GONE', m)
export const rateLimited = (m = 'Too many requests') => new AppError(429, 'RATE_LIMITED', m)
export const internal = (m = 'Internal error') => new AppError(500, 'INTERNAL', m)
export const serviceUnavailable = (code: string, m: string) => new AppError(503, code, m)
