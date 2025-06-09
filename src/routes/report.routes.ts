import { Router, Request, Response } from "express";
import { query } from "express-validator";
import { authenticateToken } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();

router.use(authenticateToken);

// เพิ่ม report controllers ภายหลัง
router.get(
  "/daily",
  [query("date").isISO8601().withMessage("Invalid date format")],
  validateRequest,
  (req: Request, res: Response) => {
    res.json({ message: "Daily report endpoint - Coming soon" });
  }
);

router.get(
  "/monthly",
  [
    query("year").isInt({ min: 2020, max: 2030 }).withMessage("Invalid year"),
    query("month").isInt({ min: 1, max: 12 }).withMessage("Invalid month"),
  ],
  validateRequest,
  (req: Request, res: Response) => {
    res.json({ message: "Monthly report endpoint - Coming soon" });
  }
);

export default router;
