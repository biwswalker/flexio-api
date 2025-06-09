import { Router } from 'express';
import { body, param } from 'express-validator';
import { 
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction 
} from '../controllers/transaction.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createTransactionValidation } from '../validations/transaction.validation';

const router = Router();

router.use(authenticateToken);

router.get('/', getTransactions);

router.post(
  '/',
  createTransactionValidation,
  validateRequest,
  auditLog('CREATE', 'Transaction'),
  createTransaction
);

router.put(
  '/:id',
  authorize(['OWNER', 'BRANCH_MANAGER']),
  [
    param('id').isUUID().withMessage('Invalid transaction ID'),
    body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  ],
  validateRequest,
  auditLog('UPDATE', 'Transaction'),
  updateTransaction
);

router.delete(
  '/:id',
  authorize(['OWNER', 'BRANCH_MANAGER']),
  [
    param('id').isUUID().withMessage('Invalid transaction ID'),
  ],
  validateRequest,
  auditLog('DELETE', 'Transaction'),
  deleteTransaction
);

export default router;