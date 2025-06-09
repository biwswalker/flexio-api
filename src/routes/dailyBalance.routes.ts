import { Router } from "express";
import {
  getDailyBalances,
  closeDailyBalance,
  getDailyBalanceCalculation,
  getUnclosedDailyBalances,
  reopenDailyBalance,
  autoCloseDailyBalance,
  recalculateDailyBalances,
} from "../controllers/dailyBalance.controller";
import { authenticateToken, authorize } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { auditLog } from "../middleware/audit.middleware";
import {
  autoCloseDailyBalanceValidation,
  closeDailyBalanceValidation,
  recalculateDailyBalancesValidation,
  reopenDailyBalanceValidation,
} from "../validations/dailyBalance.validation";
import { UserRole } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

router.get("/", getDailyBalances);
router.get("/calculate", getDailyBalanceCalculation);
router.get("/unclosed", getUnclosedDailyBalances);

router.post(
  "/close",
  closeDailyBalanceValidation,
  validateRequest,
  auditLog("CLOSE", "DailyBalance"),
  closeDailyBalance
);

// ✅ NEW: Reopen daily balance
router.post(
  "/reopen",
  authorize([UserRole.OWNER, UserRole.BRANCH_MANAGER]),
  reopenDailyBalanceValidation,
  validateRequest,
  auditLog("REOPEN", "DailyBalance"),
  reopenDailyBalance
);

// ✅ NEW: Auto close daily balance (Admin only)
router.post(
  "/auto-close",
  authorize([UserRole.OWNER]),
  autoCloseDailyBalanceValidation,
  validateRequest,
  auditLog("AUTO_CLOSE", "DailyBalance"),
  autoCloseDailyBalance
);

// ✅ NEW: Recalculate daily balances from specific date
router.post(
  "/recalculate",
  authorize([UserRole.OWNER, UserRole.BRANCH_MANAGER]),
  recalculateDailyBalancesValidation,
  validateRequest,
  auditLog("RECALCULATE", "DailyBalance"),
  recalculateDailyBalances
);

export default router;
