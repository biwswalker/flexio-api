import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../utils/database";
import { sendSuccess, sendError } from "../utils/responses";
import { config } from "../config";
import { decryption } from "../utils/crypto";
import { AuthRequest } from "../middleware/auth.middleware";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.headers;
    const { username } = req.body;

    if (!username || !credential) {
      sendError(res, "VALIDATION_ERROR", "Username and password are required");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        userBranches: {
          where: { isActive: true },
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
                type: true,
                isActive: true,
              },
            },
          },
        },
      },
    });


    if (!user || !user.isActive) {
      sendError(
        res,
        "INVALID_CREDENTIALS",
        "Invalid username or password",
        401
      );
      return;
    }

    const _decryptedCredential = decryption(String(credential))
    const isPasswordValid = await bcrypt.compare(_decryptedCredential, user.password);
    if (!isPasswordValid) {
      sendError(
        res,
        "INVALID_CREDENTIALS",
        "Invalid username or password",
        401
      );
      return;
    }

    const _signData = {
      userId: user.id,
      username: user.username,
      role: user.role,
    } as object;

    const _signOptions: SignOptions = {
      expiresIn: config.jwt.expiresIn as any,
    };

    // ดึงเฉพาะ branches ที่ active
    const activeBranches = user.userBranches
      .filter((ub) => ub.branch.isActive)
      .map((ub) => ub.branch);

    const token = jwt.sign(_signData, config.jwt.secret, _signOptions);

    sendSuccess(
      res,
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          branches: activeBranches,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
        expiresIn: config.jwt.expiresIn,
      },
      "Login successful"
    );
  } catch (error) {
    console.error("Login error:", error);
    sendError(res, "INTERNAL_ERROR", "Internal server error", 500);
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
      return;
    }

    // ดึงข้อมูลผู้ใช้ล่าสุดจากฐานข้อมูล
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        userBranches: {
          where: { isActive: true },
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
                type: true,
                address: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      sendError(res, "USER_NOT_FOUND", "User not found or inactive", 404);
      return;
    }

    // ส่งข้อมูลผู้ใช้ (ไม่รวม password)
    sendSuccess(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        branches: user.userBranches.map((ub) => ub.branch),
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      "User information retrieved successfully"
    );
  } catch (error) {
    console.error("Get me error:", error);
    sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to retrieve user information",
      500
    );
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
      return;
    }

    const { firstName, lastName, email } = req.body;

    // ตรวจสอบว่า email ใหม่ไม่ซ้ำกับคนอื่น
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: req.user.id }, // ไม่รวมตัวเอง
        },
      });

      if (existingUser) {
        sendError(res, "EMAIL_EXISTS", "Email already exists", 409, "email");
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
      },
      include: {
        userBranches: {
          where: { isActive: true },
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
                type: true,
                address: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    sendSuccess(
      res,
      {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        branches: updatedUser.userBranches,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt,
      },
      "Profile updated successfully"
    );
  } catch (error) {
    console.error("Update profile error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to update profile", 500);
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      sendError(
        res,
        "VALIDATION_ERROR",
        "Current password and new password are required"
      );
      return;
    }

    // ดึงข้อมูลผู้ใช้พร้อม password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      sendError(res, "USER_NOT_FOUND", "User not found", 404);
      return;
    }

    // ตรวจสอบ password เดิม
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      sendError(res, "INVALID_PASSWORD", "Current password is incorrect", 400);
      return;
    }

    // เข้ารหัส password ใหม่
    const hashedNewPassword = await bcrypt.hash(newPassword, Number(config.bcryptRounds));

    // อัปเดต password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword },
    });

    sendSuccess(res, null, "Password changed successfully");
  } catch (error) {
    console.error("Change password error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to change password", 500);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // ในกรณีนี้เราไม่ได้เก็บ token ในฐานข้อมูล
  // จึงแค่ส่ง response กลับไป
  sendSuccess(res, null, "Logout successful");
};
