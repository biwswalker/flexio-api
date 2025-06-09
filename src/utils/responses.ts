import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    field?: string;
    details?: any;
  };
  timestamp?: string;
  path?: string;
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  field?: string,
  details?: any
): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      field,
      details,
    },
    timestamp: new Date().toISOString(),
    path: res.req.path,
  };
  res.status(statusCode).json(response);
};
