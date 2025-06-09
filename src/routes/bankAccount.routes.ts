import { Router } from "express";
import {
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
} from "../controllers/bankAccount.controller";
import { authenticateToken, authorize } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { createBankAccountValidation, updateBankAccountValidation } from "../validations/bankAccount.validation";

const router = Router();

router.use(authenticateToken);

router.get("/", getBankAccounts);

router.post(
  "/",
  authorize(["OWNER", "BRANCH_MANAGER"]),
  createBankAccountValidation,
  validateRequest,
  auditLog("CREATE", "BankAccount"),
  createBankAccount
);

router.put(
  "/:id",
  authorize(["OWNER", "BRANCH_MANAGER"]),
  updateBankAccountValidation,
  validateRequest,
  auditLog("UPDATE", "BankAccount"),
  updateBankAccount
);

export default router;
