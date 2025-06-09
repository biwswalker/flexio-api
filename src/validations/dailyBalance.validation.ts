import { body, query } from "express-validator";

export const closeDailyBalanceValidation = [
  //   body("bankAccountId").isUUID().withMessage("Invalid bank account ID"),
  body("date").isISO8601().withMessage("Invalid date"),
  //   body("actualBalance").isFloat().withMessage("Invalid actual balance"),
];

export const reopenDailyBalanceValidation = [
  // body("bank_account_id").isUUID().withMessage("Invalid bank account ID"),
  body("date").isISO8601().withMessage("Invalid date"),
];
export const autoCloseDailyBalanceValidation = [
  // body("bank_account_id").isUUID().withMessage("Invalid bank account ID"),
  body("date").isISO8601().withMessage("Invalid date"),
  body("actual_balance").isFloat().withMessage("Invalid actual balance"),
];
export const recalculateDailyBalancesValidation = [
  // body("bank_account_id").isUUID().withMessage("Invalid bank account ID"),
  body("from_date").isISO8601().withMessage("Invalid from date"),
];
