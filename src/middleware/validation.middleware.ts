import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/responses';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    sendError(
      res,
      'VALIDATION_ERROR',
      firstError.msg,
      400,
      'param' in firstError ? (firstError as any).param : undefined
    );
    return;
  }
  
  next();
};