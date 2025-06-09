import { body, param, query } from "express-validator";

export const getTransactionCategoriesValidation = [
  query("transactionType")
    .optional()
    .isIn(["DEPOSIT", "WITHDRAWAL", "EXPENSE", "TRANSFER"])
    .withMessage("Invalid transaction type"),
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const getCategoriesByTypeValidation = [
  param("type")
    .isIn(["DEPOSIT", "WITHDRAWAL", "EXPENSE", "TRANSFER"])
    .withMessage("Invalid transaction type"),
];

export const getTransactionCategoryTypeValidation = [
  param("id").isUUID().withMessage("Invalid category ID"),
];

export const createTransactionCategoryValidation = [
  body("name")
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Category name must be between 1 and 100 characters")
    .trim(),
  body("transactionType")
    .isIn(["DEPOSIT", "WITHDRAWAL", "EXPENSE", "TRANSFER"])
    .withMessage("Invalid transaction type"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters")
    .trim(),
];

export const updateTransactionCategoryValidation = [
  param("id").isUUID().withMessage("Invalid category ID"),
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Category name cannot be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("Category name must be between 1 and 100 characters")
    .trim(),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters")
    .trim(),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const deleteTransactionCategoryValidation = [param("id").isUUID().withMessage("Invalid category ID")]
