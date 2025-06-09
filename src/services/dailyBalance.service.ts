import { prisma } from "../utils/database";

export class DailyBalanceService {
  static async calculateDailyBalance(bankAccountId: string, date: Date) {
    // Get opening balance (previous day's closing balance)
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);

    const previousBalance = await prisma.dailyBalance.findUnique({
      where: {
        balanceDate_bankAccountId: {
          balanceDate: previousDay,
          bankAccountId,
        },
      },
    });

    const openingBalance = previousBalance ? previousBalance.actualBalance : 0;

    // Get all transactions for the day
    const transactions = await prisma.transaction.findMany({
      where: {
        bankAccountId,
        transactionDate: date,
      },
    });

    // Calculate totals by type
    const totals = transactions.reduce(
      (acc, transaction) => {
        const amount = Number(transaction.amount);

        switch (transaction.type) {
          case "DEPOSIT":
            acc.totalDeposits += amount;
            break;
          case "WITHDRAWAL":
            acc.totalWithdrawals += amount;
            break;
          case "EXPENSE":
            acc.totalExpenses += amount;
            break;
          case "TRANSFER":
            acc.totalTransfers += amount;
            break;
        }

        return acc;
      },
      {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalExpenses: 0,
        totalTransfers: 0,
      }
    );

    // Calculate expected closing balance
    const closingBalance =
      Number(openingBalance) +
      totals.totalDeposits -
      totals.totalWithdrawals -
      totals.totalExpenses -
      totals.totalTransfers;

    return {
      openingBalance: Number(openingBalance),
      closingBalance,
      ...totals,
      transactionCount: transactions.length,
    };
  }

  static async closeDailyBalance(
    bankAccountId: string,
    date: Date,
    actualBalance: number,
    userId: string
  ) {
    // Check if already closed
    const existingBalance = await prisma.dailyBalance.findUnique({
      where: {
        balanceDate_bankAccountId: {
          balanceDate: date,
          bankAccountId,
        },
      },
    });

    if (existingBalance && existingBalance.isClosed) {
      throw new Error(
        "ALREADY_CLOSED: Daily balance for this date is already closed"
      );
    }

    // Calculate daily totals
    const calculation = await this.calculateDailyBalance(bankAccountId, date);

    // Calculate unknown deposits and profit using business logic
    const totalOutflow =
      calculation.totalWithdrawals +
      calculation.totalExpenses +
      calculation.totalTransfers;
    const totalKnownDeposits = calculation.totalDeposits;
    const balanceChange = actualBalance - calculation.openingBalance;

    // รวมยอดฝากทั้งหมด = (ถอน + ค่าใช้จ่าย + โอน) + (ยอดคงเหลือสิ้นวัน - ยอดยกมา)
    const totalAllDeposits = totalOutflow + balanceChange;

    // รวมยอดฝากที่ไม่รู้ = รวมยอดฝากทั้งหมด - ฝากที่บันทึกไว้
    const unknownDeposits = totalAllDeposits - totalKnownDeposits;

    // กำไร = รวมยอดฝากที่ไม่รู้ - (ถอน + ค่าใช้จ่าย)
    const profit =
      unknownDeposits -
      (calculation.totalWithdrawals + calculation.totalExpenses);

    // Create or update daily balance record
    const dailyBalance = await prisma.dailyBalance.upsert({
      where: {
        balanceDate_bankAccountId: {
          balanceDate: date,
          bankAccountId,
        },
      },
      update: {
        actualBalance,
        totalDeposits: calculation.totalDeposits,
        totalWithdrawals: calculation.totalWithdrawals,
        totalExpenses: calculation.totalExpenses,
        totalTransfers: calculation.totalTransfers,
        unknownDeposits,
        profit,
        isClosed: true,
        closedBy: userId,
      },
      create: {
        balanceDate: date,
        bankAccountId,
        openingBalance: calculation.openingBalance,
        closingBalance: calculation.closingBalance,
        actualBalance,
        totalDeposits: calculation.totalDeposits,
        totalWithdrawals: calculation.totalWithdrawals,
        totalExpenses: calculation.totalExpenses,
        totalTransfers: calculation.totalTransfers,
        unknownDeposits,
        profit,
        isClosed: true,
        closedBy: userId,
      },
    });

    return dailyBalance;
  }
}
