import { body, param } from "express-validator";

export const createBankAccountValidation = [
  // body("account_number").notEmpty().withMessage("Account number is required"),
  body("account_name").notEmpty().withMessage("Account name is required"),
  body("bank_name").notEmpty().withMessage("Bank name is required"),
//   body("branch_id").isUUID().withMessage("Invalid branch ID"),
];

export const updateBankAccountValidation = [
//   param("id").isUUID().withMessage("Invalid bank account ID"),
];
