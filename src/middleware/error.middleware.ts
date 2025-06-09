import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { sendError } from "../utils/responses";

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Error:", error);

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        sendError(res, "DUPLICATE_ENTRY", "Duplicate entry found", 409);
        return;
      case "P2025":
        sendError(res, "NOT_FOUND", "Record not found", 404);
        return;
      case "P2003":
        sendError(
          res,
          "FOREIGN_KEY_CONSTRAINT",
          "Foreign key constraint failed",
          400
        );
        return;
      default:
        sendError(res, "DATABASE_ERROR", "Database error occurred", 500);
        return;
    }
  }

  // Validation errors
  if (error.name === "ValidationError") {
    sendError(res, "VALIDATION_ERROR", error.message, 400);
    return;
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    sendError(res, "INVALID_TOKEN", "Invalid token", 401);
    return;
  }

  if (error.name === "TokenExpiredError") {
    sendError(res, "TOKEN_EXPIRED", "Token expired", 401);
    return;
  }

  // Default error
  sendError(res, "INTERNAL_ERROR", "Internal server error", 500);
};
