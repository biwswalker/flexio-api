import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { sendSuccess, sendError } from '../utils/responses';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

export const getBankAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id, is_active } = req.query;

    const where = {
      ...(is_active !== undefined && { isActive: is_active === 'true' }),
      ...(branch_id && { branchId: branch_id as string }),
      // ถ้าไม่ใช่ Admin ให้ดูเฉพาะบัญชีในสาขาที่ตัวเองเข้าถึงได้
      ...(req.user?.role !== UserRole.OWNER && { 
        branchId: { in: req.user?.branchIds || [] }
      }),
    };

    const accounts = await prisma.bankAccount.findMany({
      where,
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, { accounts });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch bank accounts', 500);
  }
};

export const createBankAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { account_number, account_name, bank_name, bank_branch, branch_id, current_balance = 0 } = req.body;

    // const existingAccount = await prisma.bankAccount.findUnique({
    //   where: { accountNumber: account_number },
    // });

    // if (existingAccount) {
    //   sendError(res, 'ACCOUNT_NUMBER_EXISTS', 'Account number already exists', 409, 'accountNumber');
    //   return;
    // }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountNumber: account_number,
        accountName: account_name,
        bankName: bank_name,
        bankBranch: bank_branch,
        branchId: branch_id,
        currentBalance: current_balance,
      },
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    sendSuccess(res, bankAccount, 'Bank account created successfully', 201);
  } catch (error) {
    console.error('Create bank account error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to create bank account', 500);
  }
};

export const updateBankAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { account_name, bank_name, is_active } = req.body;

    const bankAccount = await prisma.bankAccount.update({
      where: { id },
      data: {
        accountName: account_name,
        bankName: bank_name,
        isActive: is_active,
      },
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    sendSuccess(res, bankAccount, 'Bank account updated successfully');
  } catch (error) {
    console.error('Update bank account error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to update bank account', 500);
  }
};