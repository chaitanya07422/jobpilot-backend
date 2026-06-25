import { ApiErrorResponse, ApiSuccessResponse } from '../interfaces';

export function successResponse<T>(
  data: T,
  message = 'Success',
): ApiSuccessResponse<T> {
  return { success: true, data, message };
}

export function errorResponse(code: string, message: string): ApiErrorResponse {
  return { success: false, error: { code, message } };
}
