import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/database";
import { AuthRequest } from "./auth.middleware";

export const auditLog = (action: string, entityType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.json;

    res.json = function (body: any) {
      // Log successful operations
      if (body.success && req.user) {
        const entityId = req.params.id || body.data?.id;

        if (entityId) {
          prisma.auditLog
            .create({
              data: {
                action,
                entityType,
                entityId,
                newData: body.data,
                userId: req.user.id,
                ipAddress: req.ip,
              },
            })
            .catch(console.error);
        }
      }

      return originalSend.call(this, body);
    };

    next();
  };
};
