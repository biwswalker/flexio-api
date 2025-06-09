import { Router } from "express";
import { body, param, query } from "express-validator";
import { UserRole } from "@prisma/client";
import {
  getTransactionCategories,
  getTransactionCategory,
  createTransactionCategory,
  updateTransactionCategory,
  deleteTransactionCategory,
  getCategoriesByType,
} from "../controllers/transactionCategory.controller";
import { authenticateToken, authorize } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { auditLog } from "../middleware/audit.middleware";
import {
  createTransactionCategoryValidation,
  deleteTransactionCategoryValidation,
  getCategoriesByTypeValidation,
  getTransactionCategoriesValidation,
  getTransactionCategoryTypeValidation,
  updateTransactionCategoryValidation,
} from "../validations/transactionCategory.validation";

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all transaction categories
router.get(
  "/",
  getTransactionCategoriesValidation,
  validateRequest,
  getTransactionCategories
);

// Get categories by transaction type (for dropdowns)
router.get(
  "/by-type/:type",
  getCategoriesByTypeValidation,
  validateRequest,
  getCategoriesByType
);

// Get single transaction category
router.get(
  "/:id",
  getTransactionCategoryTypeValidation,
  validateRequest,
  getTransactionCategory
);

// Create new transaction category (Admin & Branch Manager only)
router.post(
  "/",
  authorize([UserRole.OWNER, UserRole.BRANCH_MANAGER]),
  createTransactionCategoryValidation,
  validateRequest,
  auditLog("CREATE", "TransactionCategory"),
  createTransactionCategory
);

// Update transaction category (Admin & Branch Manager only)
router.put(
  "/:id",
  authorize([UserRole.OWNER, UserRole.BRANCH_MANAGER]),
  updateTransactionCategoryValidation,
  validateRequest,
  auditLog("UPDATE", "TransactionCategory"),
  updateTransactionCategory
);

// Delete transaction category (Admin only)
router.delete(
  "/:id",
  authorize([UserRole.OWNER]),
  deleteTransactionCategoryValidation,
  validateRequest,
  auditLog("DELETE", "TransactionCategory"),
  deleteTransactionCategory
);

export default router;
