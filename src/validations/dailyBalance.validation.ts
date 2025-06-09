import { body, query } from "express-validator";

export const closeDailyBalanceValidation = [
//   body("bankAccountId").isUUID().withMessage("Invalid bank account ID"),
  body("date").isISO8601().withMessage("Invalid date"),
//   body("actualBalance").isFloat().withMessage("Invalid actual balance"),
];