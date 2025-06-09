import { Request, Response } from "express";
import { TransactionType, UserRole } from "@prisma/client";
import { prisma } from "../utils/database";
import { sendSuccess, sendError } from "../utils/responses";
import { AuthRequest } from "../middleware/auth.middleware";

export const getTransactionCategories = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { transactionType, isActive, page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      ...(transactionType &&
        typeof transactionType === "string" && {
          transactionType: transactionType as TransactionType,
        }),
      ...(isActive !== undefined && { isActive: isActive === "true" }),
    };

    console.log("getTransactionCategories where: ", where);

    const [categories, total] = await Promise.all([
      prisma.transactionCategory.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          _count: {
            select: { transactions: true },
          },
        },
        orderBy: [{ transactionType: "asc" }, { name: "asc" }],
      }),
      prisma.transactionCategory.count({ where }),
    ]);

    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      transactionType: category.transactionType,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      transactionCount: category._count.transactions,
    }));

    sendSuccess(res, {
      categories: formattedCategories,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get transaction categories error:", error);
    sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to fetch transaction categories",
      500
    );
  }
};

export const getTransactionCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await prisma.transactionCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!category) {
      sendError(
        res,
        "CATEGORY_NOT_FOUND",
        "Transaction category not found",
        404
      );
      return;
    }

    const formattedCategory = {
      id: category.id,
      name: category.name,
      transactionType: category.transactionType,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      transactionCount: category._count.transactions,
    };

    sendSuccess(res, formattedCategory);
  } catch (error) {
    console.error("Get transaction category error:", error);
    sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to fetch transaction category",
      500
    );
  }
};

export const createTransactionCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, transactionType, description } = req.body;

    // ตรวจสอบว่าชื่อซ้ำกับ transactionType เดียวกันหรือไม่
    const existingCategory = await prisma.transactionCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive", // Case insensitive
        },
        transactionType,
        isActive: true,
      },
    });

    if (existingCategory) {
      sendError(
        res,
        "CATEGORY_NAME_EXISTS",
        `Category name '${name}' already exists for ${transactionType} type`,
        409,
        "name"
      );
      return;
    }

    const category = await prisma.transactionCategory.create({
      data: {
        name: name.trim(),
        transactionType,
        description: description?.trim(),
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    const formattedCategory = {
      id: category.id,
      name: category.name,
      transactionType: category.transactionType,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      transactionCount: category._count.transactions,
    };

    sendSuccess(
      res,
      formattedCategory,
      "Transaction category created successfully",
      201
    );
  } catch (error) {
    console.error("Create transaction category error:", error);
    sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to create transaction category",
      500
    );
  }
};

export const updateTransactionCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    // ตรวจสอบว่า category มีอยู่หรือไม่
    const existingCategory = await prisma.transactionCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!existingCategory) {
      sendError(
        res,
        "CATEGORY_NOT_FOUND",
        "Transaction category not found",
        404
      );
      return;
    }

    // ถ้ามีการแก้ไขชื่อ ให้ตรวจสอบว่าซ้ำกับ category อื่นหรือไม่
    if (name && name.trim() !== existingCategory.name) {
      const duplicateCategory = await prisma.transactionCategory.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: "insensitive",
          },
          transactionType: existingCategory.transactionType,
          isActive: true,
          id: { not: id }, // ไม่รวมตัวเอง
        },
      });

      if (duplicateCategory) {
        sendError(
          res,
          "CATEGORY_NAME_EXISTS",
          `Category name '${name}' already exists for ${existingCategory.transactionType} type`,
          409,
          "name"
        );
        return;
      }
    }

    // ถ้าจะ deactivate category ที่มี transactions ให้เตือน
    if (isActive === false && existingCategory._count.transactions > 0) {
      sendError(
        res,
        "CATEGORY_IN_USE",
        `Cannot deactivate category that has ${existingCategory._count.transactions} transactions`,
        400
      );
      return;
    }

    const updatedCategory = await prisma.transactionCategory.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    const formattedCategory = {
      id: updatedCategory.id,
      name: updatedCategory.name,
      transactionType: updatedCategory.transactionType,
      description: updatedCategory.description,
      isActive: updatedCategory.isActive,
      createdAt: updatedCategory.createdAt.toISOString(),
      updatedAt: updatedCategory.updatedAt.toISOString(),
      transactionCount: updatedCategory._count.transactions,
    };

    sendSuccess(
      res,
      formattedCategory,
      "Transaction category updated successfully"
    );
  } catch (error) {
    console.error("Update transaction category error:", error);
    sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to update transaction category",
      500
    );
  }
};

export const deleteTransactionCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // ตรวจสอบว่า category มีอยู่หรือไม่
    const existingCategory = await prisma.transactionCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!existingCategory) {
      sendError(
        res,
        "CATEGORY_NOT_FOUND",
        "Transaction category not found",
        404
      );
      return;
    }

    // ถ้ามี transactions ที่ใช้ category นี้ ไม่สามารถลบได้
    if (existingCategory._count.transactions > 0) {
      sendError(
        res,
        "CATEGORY_IN_USE",
        `Cannot delete category that has ${existingCategory._count.transactions} transactions. Please deactivate instead.`,
        400
      );
      return;
    }

    // Soft delete by setting isActive to false
    await prisma.transactionCategory.update({
      where: { id },
      data: { isActive: false },
    });

    sendSuccess(res, null, "Transaction category deleted successfully");
  } catch (error) {
    console.error("Delete transaction category error:", error);
    sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to delete transaction category",
      500
    );
  }
};

export const getCategoriesByType = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { type } = req.params;

    // Validate transaction type
    const validTypes = ["DEPOSIT", "WITHDRAWAL", "EXPENSE", "TRANSFER"];
    if (!validTypes.includes(type.toUpperCase())) {
      sendError(
        res,
        "INVALID_TRANSACTION_TYPE",
        "Invalid transaction type",
        400
      );
      return;
    }

    const categories = await prisma.transactionCategory.findMany({
      where: {
        transactionType: type.toUpperCase() as any,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      transactionType: category.transactionType,
      description: category.description,
      isActive: category.isActive,
    }));

    sendSuccess(res, { categories: formattedCategories });
  } catch (error) {
    console.error("Get categories by type error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch categories by type", 500);
  }
};

// เพิ่มใน controller
export const bulkUpdateCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { updates } = req.body; // Array of { id, data }

    const results = await prisma.$transaction(
      updates.map((update: any) =>
        prisma.transactionCategory.update({
          where: { id: update.id },
          data: update.data,
        })
      )
    );

    sendSuccess(res, results, "Categories updated successfully");
  } catch (error) {
    console.error("Bulk update error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to update categories", 500);
  }
};
