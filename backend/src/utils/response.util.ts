import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
}

export class ResponseUtil {
  static success<T>(
    res: Response,
    data?: T,
    message: string = 'Operation successful',
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'Operation failed',
    errors?: Array<{ field?: string; message: string }>,
    statusCode: number = 400
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message: string = 'Resource created successfully'): Response {
    return this.success(res, data, message, 201);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized access'): Response {
    return this.error(res, message, undefined, 401);
  }

  static forbidden(res: Response, message: string = 'Access forbidden'): Response {
    return this.error(res, message, undefined, 403);
  }

  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return this.error(res, message, undefined, 404);
  }

  static serverError(res: Response, message: string = 'Internal server error'): Response {
    return this.error(res, message, undefined, 500);
  }
}
