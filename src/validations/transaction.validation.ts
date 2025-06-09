import { body } from "express-validator";

export const createTransactionValidation = [
//   body("transaction_date").isISO8601().withMessage("Invalid transaction date"),
//   body("transaction_time").isDate().withMessage("Invalid time format"),
  body("type")
    .isIn(["DEPOSIT", "WITHDRAWAL", "EXPENSE", "TRANSFER"])
    .withMessage("Invalid transaction type"),
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be greater than 0"),
//   body("bank_account_id").isUUID().withMessage("Invalid bank account ID"),
];
