import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../utils/database";
import { sendError } from "../utils/responses";
import { UserRole } from "@prisma/client";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
    branchIds: string[];
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      sendError(res, "UNAUTHORIZED", "Access token required", 401);
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userBranches: {
          where: { isActive: true },
          include: { branch: true },
        },
      },
    });

    if (!user || !user.isActive) {
      sendError(res, "UNAUTHORIZED", "Invalid or inactive user", 401);
      return;
    }

    // ดึง branch IDs ที่ user สามารถเข้าถึงได้
    const branchIds = user.userBranches
      .filter((ub) => ub.branch.isActive)
      .map((ub) => ub.branchId);

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      branchIds,
    };

    next();
  } catch (error) {
    sendError(res, "UNAUTHORIZED", "Invalid access token", 401);
  }
};

export const authorize = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'FORBIDDEN', 'Insufficient permissions', 403);
      return;
    }

    next();
  };
};

export const checkBranchAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    sendError(res, "UNAUTHORIZED", "Authentication required", 401);
    return;
  }

  // Admin สามารถเข้าถึงทุกสาขาได้
  if (req.user.role === UserRole.OWNER) {
    next();
    return;
  }

  const branchId =
    req.params.branchId || req.query.branchId || req.body.branchId;

  if (branchId && !req.user.branchIds.includes(branchId as string)) {
    sendError(res, "FORBIDDEN", "Access denied to this branch", 403);
    return;
  }

  next();
};

// ✅ เพิ่ม middleware สำหรับตรวจสอบว่าเป็นเจ้าของข้อมูลหรือไม่
export const authorizeOwnerOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    sendError(res, "UNAUTHORIZED", "Authentication required", 401);
    return;
  }

  // Admin สามารถเข้าถึงข้อมูลใดๆ ได้
  if (req.user.role === UserRole.OWNER) {
    next();
    return;
  }

  // ตรวจสอบว่าเป็นเจ้าของข้อมูลหรือไม่
  const resourceUserId = req.params.userId || req.body.userId;
  if (resourceUserId && resourceUserId !== req.user.id) {
    sendError(
      res,
      "FORBIDDEN",
      "Access denied - you can only access your own data",
      403
    );
    return;
  }

  next();
};
