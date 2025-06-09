import { Router } from "express";
import { body, param } from "express-validator";
import {
  getBranches,
  createBranch,
  updateBranch,
  getBranch,
  deleteBranch,
} from "../controllers/branch.controller";
import { authenticateToken, authorize } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { UserRole } from "@prisma/client";
import {
  createBranchValidation,
  deleteBranchValidation,
  getBranchValidation,
  updateBranchValidation,
} from "../validations/branch.validation";

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

router.get("/", getBranches);

router.post(
  "/",
  authorize([UserRole.OWNER]),
  createBranchValidation,
  validateRequest,
  auditLog("CREATE", "Branch"),
  createBranch
);

router.put(
  "/:id",
  authorize([UserRole.OWNER]),
  updateBranchValidation,
  validateRequest,
  auditLog("UPDATE", "Branch"),
  updateBranch
);

router.get(
  "/:code",
  authorize([UserRole.OWNER]),
  getBranchValidation,
  validateRequest,
  getBranch
);

// Delete branch (Admin only)
router.delete(
  "/:id",
  authorize([UserRole.OWNER]),
  deleteBranchValidation,
  validateRequest,
  auditLog("DELETE", "Branch"),
  deleteBranch
);

export default router;
