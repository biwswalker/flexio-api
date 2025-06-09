import { Request, Response } from "express";
import { prisma } from "../utils/database";
import { sendSuccess, sendError } from "../utils/responses";
import { AuthRequest } from "../middleware/auth.middleware";
import { TransactionService } from "../services/transaction.service";
import { UserRole } from "@prisma/client";

const validateTransactionCategory = async (
  categoryId: string,
  transactionType: string
) => {
  const category = await prisma.transactionCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new Error("CATEGORY_NOT_FOUND: Transaction category not found");
  }

  if (!category.isActive) {
    throw new Error("CATEGORY_INACTIVE: Transaction category is inactive");
  }

  if (category.transactionType !== transactionType) {
    throw new Error(
      `CATEGORY_TYPE_MISMATCH: Category is for ${category.transactionType} but transaction type is ${transactionType}`
    );
  }

  return category;
};

export const getTransactions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      bank_account_id,
      user_ids,
      tx_id,
      tx_date,
      tx_start_date,
      tx_end_date,
      type,
      categories,
      page = 1,
      limit = 50,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const parsedType =
      typeof type === "string"
        ? type
        : Array.isArray(type)
        ? type[0]
        : undefined;

    const where = {
      ...(bank_account_id && { bankAccountId: { in: bank_account_id as string[] } }),
      ...(tx_date && { transactionDate: new Date(tx_date as string) }),
      ...(parsedType && { type: parsedType as any }),
      // ถ้าไม่ใช่ Admin ให้ดูเฉพาะรายการในสาขาที่ตัวเองเข้าถึงได้
      ...(req.user?.role !== UserRole.OWNER && {
        bankAccount: { branchId: { in: req.user?.branchIds || [] } },
      }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          category: {
            select: { id: true, name: true },
          },
          bankAccount: {
            select: {
              id: true,
              accountNumber: true,
              accountName: true,
              bankName: true,
              branch: {
                select: { id: true, name: true },
              },
            },
          },
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ transactionDate: "desc" }, { transactionTime: "desc" }],
      }),
      prisma.transaction.count({ where }),
    ]);

    sendSuccess(res, {
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch transactions", 500);
  }
};

export const createTransaction = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      transaction_date,
      transaction_time,
      type,
      amount,
      bank_account_id,
      category_id,
      note,
      transfer_to_bank_account_id,
    } = req.body;

    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
      return;
    }

    // Validate category if provided
    if (category_id) {
      try {
        await validateTransactionCategory(category_id, type);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("CATEGORY_NOT_FOUND")) {
            sendError(
              res,
              "CATEGORY_NOT_FOUND",
              "Transaction category not found",
              404
            );
            return;
          }
          if (error.message.includes("CATEGORY_INACTIVE")) {
            sendError(
              res,
              "CATEGORY_INACTIVE",
              "Transaction category is inactive",
              400
            );
            return;
          }
          if (error.message.includes("CATEGORY_TYPE_MISMATCH")) {
            sendError(res, "CATEGORY_TYPE_MISMATCH", error.message, 400);
            return;
          }
        }
        throw error;
      }
    }

    const result = await TransactionService.createTransaction({
      transactionDate: new Date(transaction_date),
      transactionTime: transaction_time,
      type,
      amount: parseFloat(amount),
      bankAccountId: bank_account_id,
      categoryId: category_id,
      note,
      transferToBankAccountId: transfer_to_bank_account_id,
      createdBy: req.user.id,
    });

    sendSuccess(res, result, "Transaction created successfully", 201);
  } catch (error) {
    console.error("Create transaction error:", error);

    if (error instanceof Error) {
      if (error.message.includes("INSUFFICIENT_BALANCE")) {
        sendError(res, "INSUFFICIENT_BALANCE", error.message, 400);
        return;
      }
      if (error.message.includes("ACCOUNT_NOT_FOUND")) {
        sendError(res, "ACCOUNT_NOT_FOUND", error.message, 404);
        return;
      }
    }

    sendError(res, "INTERNAL_ERROR", "Failed to create transaction", 500);
  }
};

export const updateTransaction = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, note, categoryId } = req.body;

    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
      return;
    }

    const result = await TransactionService.updateTransaction(
      id,
      { amount: amount ? parseFloat(amount) : undefined, note, categoryId },
      req.user.id
    );

    sendSuccess(res, result, "Transaction updated successfully");
  } catch (error) {
    console.error("Update transaction error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to update transaction", 500);
  }
};

export const deleteTransaction = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
      return;
    }

    await TransactionService.deleteTransaction(id, req.user.id);
    sendSuccess(res, null, "Transaction deleted successfully");
  } catch (error) {
    console.error("Delete transaction error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to delete transaction", 500);
  }
};
