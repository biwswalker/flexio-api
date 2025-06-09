import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/database";
import { sendSuccess, sendError } from "../utils/responses";
import { AuthRequest } from "../middleware/auth.middleware";
import { config } from "../config";

export const getUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(role && { role: role as any }),
      ...(isActive !== undefined && { isActive: isActive === "true" }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          userBranches: {
            where: { isActive: true },
            include: {
              branch: {
                select: { id: true, name: true, code: true, type: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((user) => ({
      ...user,
      branches: user.userBranches.map((ub) => ub.branch),
      userBranches: undefined, // ไม่ต้องส่ง userBranches ออกไป
    }));

    sendSuccess(res, {
      users: formattedUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch users", 500);
  }
};

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, email, password, name, role, branchIds = [] } = req.body;

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      sendError(
        res,
        "USERNAME_EXISTS",
        "Username already exists",
        409,
        "username"
      );
      return;
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      sendError(res, "EMAIL_EXISTS", "Email already exists", 409, "email");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password,  Number(config.bcryptRounds));

    // Create user with transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          name,
          role,
        },
      });

      // Assign branches if provided
      if (branchIds.length > 0) {
        await tx.userBranch.createMany({
          data: branchIds.map((branchId: string) => ({
            userId: user.id,
            branchId,
          })),
        });
      }

      return user;
    });

    // Fetch user with branches
    const userWithBranches = await prisma.user.findUnique({
      where: { id: result.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        userBranches: {
          where: { isActive: true },
          include: {
            branch: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });

    sendSuccess(
      res,
      {
        ...userWithBranches,
        branches: userWithBranches?.userBranches.map((ub) => ub.branch),
        userBranches: undefined,
      },
      "User created successfully",
      201
    );
  } catch (error) {
    console.error("Create user error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to create user", 500);
  }
};

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    // Check if email already exists (excluding current user)
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (existingEmail) {
        sendError(res, "EMAIL_EXISTS", "Email already exists", 409, "email");
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
        userBranches: {
          where: { isActive: true },
          include: {
            branch: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });

    sendSuccess(
      res,
      {
        ...user,
        branches: user.userBranches.map((ub) => ub.branch),
        userBranches: undefined,
      },
      "User updated successfully"
    );
  } catch (error) {
    console.error("Update user error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to update user", 500);
  }
};

export const assignUserToBranches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { branchIds } = req.body;

    if (!Array.isArray(branchIds)) {
      sendError(res, "VALIDATION_ERROR", "branchIds must be an array");
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      sendError(res, "USER_NOT_FOUND", "User not found", 404);
      return;
    }

    // Verify all branches exist
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds } },
    });

    if (branches.length !== branchIds.length) {
      sendError(res, "BRANCH_NOT_FOUND", "One or more branches not found", 404);
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Remove existing assignments
      await tx.userBranch.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // Create new assignments
      if (branchIds.length > 0) {
        // Create or reactivate assignments
        for (const branchId of branchIds) {
          await tx.userBranch.upsert({
            where: {
              userId_branchId: { userId, branchId },
            },
            update: { isActive: true },
            create: { userId, branchId },
          });
        }
      }
    });

    // Fetch updated user with branches
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        userBranches: {
          where: { isActive: true },
          include: {
            branch: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });

    sendSuccess(
      res,
      {
        ...updatedUser,
        branches: updatedUser?.userBranches.map((ub) => ub.branch),
        userBranches: undefined,
      },
      "User branches assigned successfully"
    );
  } catch (error) {
    console.error("Assign user branches error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to assign user branches", 500);
  }
};

export const getUserBranches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const userBranches = await prisma.userBranch.findMany({
      where: {
        userId,
        isActive: true,
      },
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
    });

    const branches = userBranches
      .filter((ub) => ub.branch.isActive)
      .map((ub) => ub.branch);

    sendSuccess(res, { branches });
  } catch (error) {
    console.error("Get user branches error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch user branches", 500);
  }
};
