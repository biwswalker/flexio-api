import { body, param } from "express-validator";

export const getBranchValidation = [
  param("code").notEmpty().withMessage("Require branch code"),
];
export const deleteBranchValidation = [
  param("id").isUUID().withMessage("Invalid branch ID"),
];
export const updateBranchValidation = [
  param("id").isUUID().withMessage("Invalid branch ID"),
  body("name").optional().notEmpty().withMessage("Branch name cannot be empty"),
];
export const createBranchValidation = [
  body("code").notEmpty().withMessage("Branch code is required"),
  body("name").notEmpty().withMessage("Branch name is required"),
  body("type").isIn(["MAIN", "SUB"]).withMessage("Invalid branch type"),
];
