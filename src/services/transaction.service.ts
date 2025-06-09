import { prisma } from '../utils/database';
import { TransactionType } from '@prisma/client';

interface CreateTransactionInput {
  transactionDate: Date;
  transactionTime: string;
  type: TransactionType;
  amount: number;
  bankAccountId: string;
  categoryId?: string;
  note?: string;
  transferToBankAccountId?: string;
  createdBy: string;
}

interface UpdateTransactionInput {
  amount?: number;
  note?: string;
  categoryId?: string;
}

export class TransactionService {
  static async createTransaction(input: CreateTransactionInput) {
    console.log('input: : ', input)
    return await prisma.$transaction(async (tx) => {
      // Check bank account exists
      const bankAccount = await tx.bankAccount.findUnique({
        where: { id: input.bankAccountId },
      });

      if (!bankAccount) {
        throw new Error('ACCOUNT_NOT_FOUND: Bank account not found');
      }

      // Check sufficient balance for withdrawal, expense, and transfer
      // if (['WITHDRAWAL', 'EXPENSE', 'TRANSFER'].includes(input.type)) {
      //   if (Number(bankAccount.currentBalance) < input.amount) {
      //     throw new Error(`INSUFFICIENT_BALANCE: Current balance: ${bankAccount.currentBalance}, Requested: ${input.amount}`);
      //   }
      // }

      // Calculate new balance
      let newBalance = bankAccount.currentBalance;
      if (input.type === 'DEPOSIT') {
        newBalance = newBalance.plus(input.amount);
      } else {
        newBalance = newBalance.minus(input.amount);
      }

      // Create main transaction
      const transaction = await tx.transaction.create({
        data: {
          transactionDate: input.transactionDate,
          transactionTime: input.transactionTime,
          type: input.type,
          amount: input.amount,
          balanceAfter: newBalance,
          note: input.note,
          bankAccountId: input.bankAccountId,
          categoryId: input.categoryId,
          createdBy: input.createdBy,
          referenceNumber: `TXN${Date.now()}`,
        },
      });

      // Update bank account balance
      await tx.bankAccount.update({
        where: { id: input.bankAccountId },
        data: { currentBalance: newBalance },
      });

      // Handle transfer - create corresponding deposit transaction
      let relatedTransaction = null;
      if (input.type === 'TRANSFER' && input.transferToBankAccountId) {
        const targetAccount = await tx.bankAccount.findUnique({
          where: { id: input.transferToBankAccountId },
        });

        if (!targetAccount) {
          throw new Error('TARGET_ACCOUNT_NOT_FOUND: Target bank account not found');
        }

        const targetNewBalance = targetAccount.currentBalance.plus(input.amount);

        relatedTransaction = await tx.transaction.create({
          data: {
            transactionDate: input.transactionDate,
            transactionTime: input.transactionTime,
            type: 'DEPOSIT',
            amount: input.amount,
            balanceAfter: targetNewBalance,
            note: `Transfer from ${bankAccount.accountNumber}`,
            bankAccountId: input.transferToBankAccountId,
            createdBy: input.createdBy,
            referenceNumber: `TXN${Date.now()}_TRF`,
            relatedTransactionId: transaction.id,
          },
        });

        // Update related transaction ID in main transaction
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { relatedTransactionId: relatedTransaction.id },
        });

        // Update target account balance
        await tx.bankAccount.update({
          where: { id: input.transferToBankAccountId },
          data: { currentBalance: targetNewBalance },
        });
      }

      return {
        transaction,
        relatedTransaction,
      };
    });
  }

  static async updateTransaction(
    transactionId: string, 
    updates: UpdateTransactionInput,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { bankAccount: true },
      });

      if (!existingTransaction) {
        throw new Error('Transaction not found');
      }

      // If amount is being updated, recalculate balances
      if (updates.amount !== undefined) {
        const amountDifference = Number(updates.amount) - Number(existingTransaction.amount);
        
        let newBalance = existingTransaction.bankAccount.currentBalance;
        if (existingTransaction.type === 'DEPOSIT') {
          newBalance = newBalance.plus(amountDifference);
        } else {
          newBalance = newBalance.minus(amountDifference);
        }

        if (Number(newBalance) < 0) {
          throw new Error('INSUFFICIENT_BALANCE: Update would result in negative balance');
        }

        // Update bank account balance
        await tx.bankAccount.update({
          where: { id: existingTransaction.bankAccountId },
          data: { currentBalance: newBalance },
        });

        updates = { ...updates, amount: updates.amount };
      }

      const updatedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          ...updates,
          ...(updates.amount && { balanceAfter: existingTransaction.balanceAfter }),
        },
      });

      return updatedTransaction;
    });
  }

  static async deleteTransaction(transactionId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { bankAccount: true, relatedTransaction: true },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Reverse the balance change
      let newBalance = transaction.bankAccount.currentBalance;
      if (transaction.type === 'DEPOSIT') {
        newBalance = newBalance.minus(transaction.amount);
      } else {
        newBalance = newBalance.plus(transaction.amount);
      }

      if (Number(newBalance) < 0) {
        throw new Error('INSUFFICIENT_BALANCE: Deletion would result in negative balance');
      }

      // Update bank account balance
      await tx.bankAccount.update({
        where: { id: transaction.bankAccountId },
        data: { currentBalance: newBalance },
      });

      // If this is a transfer, also delete the related transaction
      if (transaction.relatedTransaction) {
        await tx.transaction.delete({
          where: { id: transaction.relatedTransaction.id },
        });
      }

      // Delete the main transaction
      await tx.transaction.delete({
        where: { id: transactionId },
      });

      return true;
    });
  }
}