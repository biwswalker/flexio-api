import { Request, Response } from "express";
import { prisma } from "../utils/database";
import { sendSuccess, sendError } from "../utils/responses";
import { AuthRequest } from "../middleware/auth.middleware";
import { DailyBalanceService } from "../services/dailyBalance.service";
import { UserRole } from "@prisma/client";

export const getDailyBalances = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bank_account_id, date, is_closed } = req.query;

    const where = {
      ...(bank_account_id && { bankAccountId: bank_account_id as string }),
      ...(date && { balanceDate: new Date(date as string) }),
      ...(is_closed !== undefined && { isClosed: is_closed === "true" }),
      // ถ้าไม่ใช่ Admin ให้ดูเฉพาะยอดในสาขาที่ตัวเองเข้าถึงได้
      ...(req.user?.role !== UserRole.OWNER && {
        bankAccount: { branchId: { in: req.user?.branchIds || [] } },
      }),
    };

    const dailyBalances = await prisma.dailyBalance.findMany({
      where,
      include: {
        bankAccount: {
          select: { id: true, accountNumber: true, accountName: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { balanceDate: "desc" },
    });

    sendSuccess(res, { dailyBalances });
  } catch (error) {
    console.error("Get daily balances error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch daily balances", 500);
  }
};

export const closeDailyBalance = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bank_account_id, date, actual_balance } = req.body;

    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
      return;
    }

    const dailyBalance = await DailyBalanceService.closeDailyBalance(
      bank_account_id,
      new Date(date),
      parseFloat(actual_balance),
      req.user.id
    );

    sendSuccess(res, { dailyBalance }, "Daily balance closed successfully");
  } catch (error) {
    console.error("Close daily balance error:", error);

    if (error instanceof Error) {
      if (error.message.includes("ALREADY_CLOSED")) {
        sendError(res, "DAILY_BALANCE_CLOSED", error.message, 400);
        return;
      }
    }

    sendError(res, "INTERNAL_ERROR", "Failed to close daily balance", 500);
  }
};

export const getDailyBalanceCalculation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bank_account_id, date } = req.query;

    if (!bank_account_id || !date) {
      sendError(
        res,
        "VALIDATION_ERROR",
        "Bank account ID and date are required"
      );
      return;
    }

    const calculation = await DailyBalanceService.calculateDailyBalance(
      bank_account_id as string,
      new Date(date as string)
    );

    sendSuccess(res, calculation);
  } catch (error) {
    console.error("Get daily balance calculation error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to calculate daily balance", 500);
  }
};

// ✅ NEW: Reopen daily balance
export const reopenDailyBalance = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bank_account_id, date } = req.body;

    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
      return;
    }

    // ตรวจสอบสิทธิ์ (เฉพาะ ADMIN และ BRANCH_MANAGER)
    if (![UserRole.OWNER, UserRole.BRANCH_MANAGER].includes(req.user.role as any)) {
      sendError(
        res,
        "FORBIDDEN",
        "Insufficient permissions to reopen daily balance",
        403
      );
      return;
    }

    await DailyBalanceService.reopenDailyBalance(
      bank_account_id,
      new Date(date),
      req.user.id
    );

    sendSuccess(
      res,
      {
        message:
          "Daily balance reopened successfully. You can now modify transactions and reclose.",
      },
      "Daily balance reopened successfully"
    );
  } catch (error) {
    console.error("Reopen daily balance error:", error);

    if (error instanceof Error) {
      if (error.message.includes("DAILY_BALANCE_NOT_CLOSED")) {
        sendError(res, "DAILY_BALANCE_NOT_CLOSED", error.message, 400);
        return;
      }
    }

    sendError(res, "INTERNAL_ERROR", "Failed to reopen daily balance", 500);
  }
};

// ✅ NEW: Get unclosed daily balances
export const getUnclosedDailyBalances = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bank_account_id } = req.query;

    if (!bank_account_id) {
      sendError(res, "VALIDATION_ERROR", "Bank account ID is required");
      return;
    }

    const unclosedBalances = await DailyBalanceService.getUnclosedDailyBalances(
      bank_account_id as string
    );

    sendSuccess(res, {
      unclosedBalances,
      count: unclosedBalances.length,
    });
  } catch (error) {
    console.error("Get unclosed daily balances error:", error);
    sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to fetch unclosed daily balances",
      500
    );
  }
};

// ✅ NEW: Recalculate daily balances from specific date
export const recalculateDailyBalances = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bank_account_id, fromDate } = req.body;

    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
      return;
    }

    // ตรวจสอบสิทธิ์ (เฉพาะ ADMIN และ BRANCH_MANAGER)
    if (![UserRole.OWNER, UserRole.BRANCH_MANAGER].includes(req.user.role as any)) {
      sendError(
        res,
        "FORBIDDEN",
        "Insufficient permissions to recalculate daily balances",
        403
      );
      return;
    }

    if (!bank_account_id || !fromDate) {
      sendError(
        res,
        "VALIDATION_ERROR",
        "Bank account ID and from date are required"
      );
      return;
    }

    const result = await DailyBalanceService.recalculateDailyBalancesFromDate(
      bank_account_id,
      new Date(fromDate),
      req.user.id
    );

    sendSuccess(res, result, "Daily balances recalculated successfully");
  } catch (error) {
    console.error("Recalculate daily balances error:", error);
    sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to recalculate daily balances",
      500
    );
  }
};

// ✅ NEW: Auto close daily balance (for system integration)
export const autoCloseDailyBalance = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bank_account_id, date, actual_balance } = req.body;

    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
      return;
    }

    // ตรวจสอบสิทธิ์ (เฉพาะ ADMIN)
    if (req.user.role !== UserRole.OWNER) {
      sendError(res, "FORBIDDEN", "Only admin can use auto close feature", 403);
      return;
    }

    const dailyBalance = await DailyBalanceService.autoCloseDailyBalance(
      bank_account_id,
      new Date(date),
      parseFloat(actual_balance),
      req.user.id
    );

    sendSuccess(
      res,
      {
        dailyBalance,
        message:
          "Daily balance auto-closed successfully. Bank account balance updated.",
      },
      "Daily balance auto-closed successfully"
    );
  } catch (error) {
    console.error("Auto close daily balance error:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to auto close daily balance", 500);
  }
};
