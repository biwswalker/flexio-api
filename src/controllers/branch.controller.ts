import { Request, Response } from "express";
import { prisma } from "../utils/database";
import { sendSuccess, sendError } from "../utils/responses";
import { AuthRequest } from "../middleware/auth.middleware";
import { UserRole } from "@prisma/client";

export const getBranches = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(isActive !== undefined && { isActive: isActive === "true" }),
      // ถ้าไม่ใช่ Admin ให้ดูเฉพาะสาขาที่ตัวเองเข้าถึงได้
      ...(req.user?.role !== UserRole.OWNER && {
        id: { in: req.user?.branchIds || [] },
      }),
    };

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          _count: {
            select: { bankAccounts: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.branch.count({ where }),
    ]);

    const formattedBranches = branches.map((branch) => ({
      id: branch.id,
      code: branch.code,
      name: branch.name,
      type: branch.type,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
      accountCount: branch._count.bankAccounts,
      createdAt: branch.createdAt,
    }));

    sendSuccess(res, {
      branches: formattedBranches,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get branches error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch branches", 500);
  }
};

export const createBranch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { code, name, type, address, phone } = req.body;

    const existingBranch = await prisma.branch.findUnique({
      where: { code },
    });

    if (existingBranch) {
      sendError(
        res,
        "BRANCH_CODE_EXISTS",
        "Branch code already exists",
        409,
        "code"
      );
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          code,
          name,
          type,
          address,
          phone,
        },
      });

      await tx.userBranch.create({
        data: {
          userId: req.user?.id as string,
          branchId: branch.id,
        },
      });

      return branch;
    });

    sendSuccess(res, result, "Branch created successfully", 201);
  } catch (error) {
    console.error("Create branch error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to create branch", 500);
  }
};

export const updateBranch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address, phone, isActive } = req.body;

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        address,
        phone,
        isActive,
      },
    });

    sendSuccess(res, branch, "Branch updated successfully");
  } catch (error) {
    console.error("Update branch error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to update branch", 500);
  }
};

export const getBranch = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id, is_active, code } = req.params;

    console.log("req.params", req.params);

    // ตรวจสอบสิทธิ์การเข้าถึง
    const where = {
      ...(id ? { id } : {}),
      ...(code ? { code } : {}),
      ...(is_active ? { isActive: is_active === "true" } : {}),
      // ถ้าไม่ใช่ Admin ให้ดูเฉพาะสาขาที่ตัวเองเข้าถึงได้
      ...(req.user?.role !== UserRole.OWNER && {
        id: { in: req.user?.branchIds || [] },
      }),
    };

    const branch = await prisma.branch.findFirst({
      where,
      include: {
        _count: {
          select: {
            bankAccounts: true,
            userBranches: { where: { isActive: true } },
          },
        },
        bankAccounts: {
          where: { isActive: true },
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            bankName: true,
            currentBalance: true,
            isActive: true,
          },
        },
      },
    });

    if (!branch) {
      sendError(
        res,
        "BRANCH_NOT_FOUND",
        "Branch not found or access denied",
        404
      );
      return;
    }

    const formattedBranch = {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      type: branch.type,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
      stats: {
        bankAccountsCount: branch._count.bankAccounts,
        usersCount: branch._count.userBranches,
      },
      bankAccounts: branch.bankAccounts,
    };

    sendSuccess(res, formattedBranch);
  } catch (error) {
    console.error("Get branch error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch branch", 500);
  }
};

export const deleteBranch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // ตรวจสอบว่ามี bank accounts หรือ users ที่เชื่อมโยงหรือไม่
    const branchUsage = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bankAccounts: true,
            userBranches: { where: { isActive: true } },
          },
        },
      },
    });

    if (!branchUsage) {
      sendError(res, "BRANCH_NOT_FOUND", "Branch not found", 404);
      return;
    }

    if (
      branchUsage._count.bankAccounts > 0 ||
      branchUsage._count.userBranches > 0
    ) {
      sendError(
        res,
        "BRANCH_IN_USE",
        "Cannot delete branch that has bank accounts or users assigned",
        400
      );
      return;
    }

    // Soft delete by setting isActive to false
    await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });

    sendSuccess(res, null, "Branch deleted successfully");
  } catch (error) {
    console.error("Delete branch error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to delete branch", 500);
  }
};
