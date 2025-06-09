import { prisma } from "../utils/database";
import { TransactionType } from "@prisma/client";

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
    return await prisma.$transaction(async (tx) => {
      // Check bank account exists
      const bankAccount = await tx.bankAccount.findUnique({
        where: { id: input.bankAccountId },
      });

      if (!bankAccount) {
        throw new Error("ACCOUNT_NOT_FOUND: Bank account not found");
      }

      // Check sufficient balance for withdrawal, expense, and transfer
      // if (['WITHDRAWAL', 'EXPENSE', 'TRANSFER'].includes(input.type)) {
      //   if (Number(bankAccount.currentBalance) < input.amount) {
      //     throw new Error(`INSUFFICIENT_BALANCE: Current balance: ${bankAccount.currentBalance}, Requested: ${input.amount}`);
      //   }
      // }

      // ✅ NEW: ตรวจสอบว่าวันที่ทำรายการมีการปิดยอดแล้วหรือไม่
      const transactionDate = new Date(input.transactionDate);
      const existingDailyBalance = await tx.dailyBalance.findUnique({
        where: {
          balanceDate_bankAccountId: {
            balanceDate: transactionDate,
            bankAccountId: input.bankAccountId,
          },
        },
      });

      // ถ้าวันนั้นปิดยอดแล้ว ให้ reopen
      if (existingDailyBalance && existingDailyBalance.isClosed) {
        await tx.dailyBalance.update({
          where: {
            balanceDate_bankAccountId: {
              balanceDate: transactionDate,
              bankAccountId: input.bankAccountId,
            },
          },
          data: {
            isClosed: false,
            closedBy: null,
          },
        });
      }

      let newBalance = bankAccount.currentBalance;
      if (input.type === "DEPOSIT") {
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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      transactionDate.setHours(0, 0, 0, 0);

      if (transactionDate.getTime() === today.getTime()) {
        // วันปัจจุบัน → อัพเดท currentBalance
        await tx.bankAccount.update({
          where: { id: input.bankAccountId },
          data: { currentBalance: newBalance },
        });
      } else {
        // วันอื่น → ไม่อัพเดท currentBalance (จะอัพเดทเมื่อปิดยอด)
        console.log(
          `Transaction created for past date: ${
            transactionDate.toISOString().split("T")[0]
          }, currentBalance not updated`
        );
      }

      // Handle transfer - create corresponding deposit transaction
      let relatedTransaction = null;
      if (input.type === "TRANSFER" && input.transferToBankAccountId) {
        const targetAccount = await tx.bankAccount.findUnique({
          where: { id: input.transferToBankAccountId },
        });

        if (!targetAccount) {
          throw new Error(
            "TARGET_ACCOUNT_NOT_FOUND: Target bank account not found"
          );
        }

        const targetNewBalance = targetAccount.currentBalance.plus(
          input.amount
        );

        relatedTransaction = await tx.transaction.create({
          data: {
            transactionDate: input.transactionDate,
            transactionTime: input.transactionTime,
            type: "DEPOSIT",
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

        // อัพเดท target account balance เฉพาะวันปัจจุบัน
        if (transactionDate.getTime() === today.getTime()) {
          await tx.bankAccount.update({
            where: { id: input.transferToBankAccountId },
            data: { currentBalance: targetNewBalance },
          });
        }
      }

      return {
        transaction,
        relatedTransaction,
        reopenedDailyBalance: existingDailyBalance?.isClosed || false,
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
        throw new Error("Transaction not found");
      }

      const transactionDate = new Date(existingTransaction.transactionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      transactionDate.setHours(0, 0, 0, 0);

      // ✅ NEW: ตรวจสอบว่าแก้ไข transaction ย้อนหลังหรือไม่
      const isHistoricalTransaction =
        transactionDate.getTime() < today.getTime();
      const isTodayTransaction = transactionDate.getTime() === today.getTime();

      // ถ้าแก้ไข transaction ย้อนหลัง ให้ reopen daily balance
      if (isHistoricalTransaction) {
        const dailyBalance = await tx.dailyBalance.findUnique({
          where: {
            balanceDate_bankAccountId: {
              balanceDate: transactionDate,
              bankAccountId: existingTransaction.bankAccountId,
            },
          },
        });

        if (dailyBalance && dailyBalance.isClosed) {
          await tx.dailyBalance.update({
            where: {
              balanceDate_bankAccountId: {
                balanceDate: transactionDate,
                bankAccountId: existingTransaction.bankAccountId,
              },
            },
            data: {
              isClosed: false,
              closedBy: null,
            },
          });
        }
      }

      // If amount is being updated, recalculate balances
      if (updates.amount !== undefined) {
        const amountDifference =
          Number(updates.amount) - Number(existingTransaction.amount);

        // เฉพาะ transaction วันปัจจุบันเท่านั้นที่อัพเดท currentBalance
        if (isTodayTransaction) {
          let newBalance = existingTransaction.bankAccount.currentBalance;
          if (existingTransaction.type === "DEPOSIT") {
            newBalance = newBalance.plus(amountDifference);
          } else {
            newBalance = newBalance.minus(amountDifference);
          }

          if (Number(newBalance) < 0) {
            throw new Error(
              "INSUFFICIENT_BALANCE: Update would result in negative balance"
            );
          }

          // Update bank account balance
          await tx.bankAccount.update({
            where: { id: existingTransaction.bankAccountId },
            data: { currentBalance: newBalance },
          });
        }
      }

      // Update transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      return {
        transaction: updatedTransaction,
        isHistoricalUpdate: isHistoricalTransaction,
        reopenedDailyBalance: isHistoricalTransaction,
      };
    });
  }

  // ✅ UPDATED: สามารถลบ transaction ย้อนหลังได้
  static async deleteTransaction(transactionId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { bankAccount: true, relatedTransaction: true },
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      const transactionDate = new Date(transaction.transactionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      transactionDate.setHours(0, 0, 0, 0);

      const isHistoricalTransaction =
        transactionDate.getTime() < today.getTime();
      const isTodayTransaction = transactionDate.getTime() === today.getTime();

      // ถ้าลบ transaction ย้อนหลัง ให้ reopen daily balance
      if (isHistoricalTransaction) {
        const dailyBalance = await tx.dailyBalance.findUnique({
          where: {
            balanceDate_bankAccountId: {
              balanceDate: transactionDate,
              bankAccountId: transaction.bankAccountId,
            },
          },
        });

        if (dailyBalance && dailyBalance.isClosed) {
          await tx.dailyBalance.update({
            where: {
              balanceDate_bankAccountId: {
                balanceDate: transactionDate,
                bankAccountId: transaction.bankAccountId,
              },
            },
            data: {
              isClosed: false,
              closedBy: null,
            },
          });
        }
      }

      // Reverse the balance change เฉพาะ transaction วันปัจจุบัน
      if (isTodayTransaction) {
        let newBalance = transaction.bankAccount.currentBalance;
        if (transaction.type === "DEPOSIT") {
          newBalance = newBalance.minus(transaction.amount);
        } else {
          newBalance = newBalance.plus(transaction.amount);
        }

        if (Number(newBalance) < 0) {
          throw new Error(
            "INSUFFICIENT_BALANCE: Deletion would result in negative balance"
          );
        }

        // Update bank account balance
        await tx.bankAccount.update({
          where: { id: transaction.bankAccountId },
          data: { currentBalance: newBalance },
        });
      }

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

      return {
        success: true,
        isHistoricalDeletion: isHistoricalTransaction,
        reopenedDailyBalance: isHistoricalTransaction,
      };
    });
  }

  static async bulkUpdateHistoricalTransactions(
    updates: Array<{
      transactionId: string;
      updates: UpdateTransactionInput;
    }>,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const affectedDates = new Set<string>();
      const affectedBankAccounts = new Set<string>();

      for (const { transactionId, updates: transactionUpdates } of updates) {
        const transaction = await tx.transaction.findUnique({
          where: { id: transactionId },
        });

        if (transaction) {
          // เก็บวันที่และบัญชีที่ได้รับผลกระทบ
          affectedDates.add(
            transaction.transactionDate.toISOString().split("T")[0]
          );
          affectedBankAccounts.add(transaction.bankAccountId);

          // อัพเดท transaction
          await tx.transaction.update({
            where: { id: transactionId },
            data: transactionUpdates,
          });
        }
      }

      // Reopen daily balances ที่ได้รับผลกระทบ
      for (const bankAccountId of affectedBankAccounts) {
        for (const dateStr of affectedDates) {
          const date = new Date(dateStr);

          const dailyBalance = await tx.dailyBalance.findUnique({
            where: {
              balanceDate_bankAccountId: {
                balanceDate: date,
                bankAccountId,
              },
            },
          });

          if (dailyBalance && dailyBalance.isClosed) {
            await tx.dailyBalance.update({
              where: {
                balanceDate_bankAccountId: {
                  balanceDate: date,
                  bankAccountId,
                },
              },
              data: {
                isClosed: false,
                closedBy: null,
              },
            });
          }
        }
      }

      return {
        updatedTransactions: updates.length,
        affectedDates: Array.from(affectedDates),
        affectedBankAccounts: Array.from(affectedBankAccounts),
      };
    });
  }
}
