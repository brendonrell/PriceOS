import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
}

export type ApiErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED';

export function notFound(message = 'Not found'): NextResponse<ApiError> {
  return NextResponse.json<ApiError>(
    { error: message, code: 'NOT_FOUND' },
    { status: 404 }
  );
}

export function unauthorized(message = 'Unauthorized'): NextResponse<ApiError> {
  return NextResponse.json<ApiError>(
    { error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

export function badRequest(
  message = 'Bad request',
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json<ApiError>(
    { error: message, code: 'BAD_REQUEST', details },
    { status: 400 }
  );
}

export function serverError(message = 'Internal server error'): NextResponse<ApiError> {
  return NextResponse.json<ApiError>(
    { error: message, code: 'SERVER_ERROR' },
    { status: 500 }
  );
}

export function rateLimited(
  retryAfterSeconds: number,
  message = 'Rate limit exceeded'
): NextResponse<ApiError> {
  return NextResponse.json<ApiError>(
    { error: message, code: 'RATE_LIMITED' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  );
}
