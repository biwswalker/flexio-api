import { Router } from "express";
import {
  changePassword,
  getMe,
  login,
  logout,
  updateProfile,
} from "../controllers/auth.controller";
import { validateRequest } from "../middleware/validation.middleware";
import { authenticateToken } from "../middleware/auth.middleware";
import { auditLog } from "../middleware/audit.middleware";
import {
  changePasswordValidation,
  loginValidation,
  updateProfileValidation,
} from "../validations/auth.validation";

const router = Router();

// ✅ Get login
router.post("/login", loginValidation, validateRequest, login);

router.use(authenticateToken); // Apply authentication to routes below

// ✅ Get current user info
router.get("/me", getMe);

// ✅ Update user profile
router.put(
  "/profile",
  updateProfileValidation,
  validateRequest,
  auditLog("UPDATE_PROFILE", "User"),
  updateProfile
);

// ✅ Change password
router.put(
  "/change-password",
  changePasswordValidation,
  validateRequest,
  auditLog("CHANGE_PASSWORD", "User"),
  changePassword
);

// ✅ Logout
router.post("/logout", logout);

export default router;
