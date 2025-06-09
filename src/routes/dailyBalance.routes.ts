import { Router } from "express";
import { body, param, query } from "express-validator";
import {
  getDailyBalances,
  closeDailyBalance,
  getDailyBalanceCalculation,
} from "../controllers/dailyBalance.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { closeDailyBalanceValidation } from "../validations/dailyBalance.validation";

const router = Router();

router.use(authenticateToken);

router.get("/", getDailyBalances);
router.get("/calculate", getDailyBalanceCalculation);

router.post(
  "/close",
  closeDailyBalanceValidation,
  validateRequest,
  auditLog("CLOSE", "DailyBalance"),
  closeDailyBalance
);

export default router;
