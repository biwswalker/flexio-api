import { body, header } from "express-validator";

export const loginValidation = [
  body("username").notEmpty().withMessage("กรุณากรอกอีเมลและรหัสผ่าน"),
  header("credential").notEmpty().withMessage("ระบุ credential"),
];

export const updateProfileValidation = [
  body("first_name")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("First name must be between 1 and 100 characters")
    .trim(),
  body("last_name")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Last name must be between 1 and 100 characters")
    .trim(),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
];

export const changePasswordValidation = [
  body("current_password")
    .notEmpty()
    .withMessage("Current password is required"),
  body("new_password")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];
