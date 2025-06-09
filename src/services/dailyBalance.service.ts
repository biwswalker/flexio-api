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
    return await prisma.$transaction(async (tx) => {
      // Check if already closed
      const existingBalance = await tx.dailyBalance.findUnique({
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
      const dailyBalance = await tx.dailyBalance.upsert({
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

      // ✅ NEW: อัพเดท bankAccount.currentBalance ให้ตรงกับ actualBalance
      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: { currentBalance: actualBalance },
      });

      return dailyBalance;
    });
  }

  static async reopenDailyBalance(
    bankAccountId: string,
    date: Date,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const dailyBalance = await tx.dailyBalance.findUnique({
        where: {
          balanceDate_bankAccountId: {
            balanceDate: date,
            bankAccountId,
          },
        },
      });

      if (!dailyBalance || !dailyBalance.isClosed) {
        throw new Error(
          "DAILY_BALANCE_NOT_CLOSED: Daily balance is not closed or does not exist"
        );
      }

      // Reopen the daily balance
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

      return true;
    });
  }

  static async recalculateDailyBalancesFromDate(
    bankAccountId: string,
    fromDate: Date,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // หาทุกวันที่ต้อง recalculate (จาก fromDate ถึงปัจจุบัน)
      const today = new Date();
      const daysToRecalculate: Date[] = [];

      for (let d = new Date(fromDate); d <= today; d.setDate(d.getDate() + 1)) {
        daysToRecalculate.push(new Date(d));
      }

      for (const date of daysToRecalculate) {
        // หา dailyBalance ที่มีอยู่
        const existingBalance = await tx.dailyBalance.findUnique({
          where: {
            balanceDate_bankAccountId: {
              balanceDate: date,
              bankAccountId,
            },
          },
        });

        if (existingBalance && existingBalance.isClosed) {
          // ถ้าปิดยอดแล้ว ให้ reopen
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

          console.log(
            `Reopened daily balance for ${date.toISOString().split("T")[0]}`
          );
        }
      }

      return {
        message: `Recalculated daily balances from ${
          fromDate.toISOString().split("T")[0]
        } to ${today.toISOString().split("T")[0]}`,
        affectedDays: daysToRecalculate.length,
      };
    });
  }

  // ✅ NEW: Get daily balances ที่ต้อง reclose
  static async getUnclosedDailyBalances(bankAccountId: string) {
    const unclosedBalances = await prisma.dailyBalance.findMany({
      where: {
        bankAccountId,
        isClosed: false,
        balanceDate: {
          lt: new Date(), // วันก่อนหน้าวันนี้
        },
      },
      orderBy: { balanceDate: "asc" },
      include: {
        bankAccount: {
          select: { accountNumber: true, accountName: true },
        },
      },
    });

    return unclosedBalances;
  }

  // ✅ NEW: Auto close daily balance (สำหรับใช้ในกรณีที่มี actualBalance จากระบบอื่น)
  static async autoCloseDailyBalance(
    bankAccountId: string,
    date: Date,
    actualBalance: number,
    userId: string
  ) {
    // เหมือน closeDailyBalance แต่ skip การตรวจสอบ ALREADY_CLOSED
    return await prisma.$transaction(async (tx) => {
      const calculation = await this.calculateDailyBalance(bankAccountId, date);

      const totalOutflow =
        calculation.totalWithdrawals +
        calculation.totalExpenses +
        calculation.totalTransfers;
      const totalKnownDeposits = calculation.totalDeposits;
      const balanceChange = actualBalance - calculation.openingBalance;

      const totalAllDeposits = totalOutflow + balanceChange;
      const unknownDeposits = totalAllDeposits - totalKnownDeposits;
      const profit =
        unknownDeposits -
        (calculation.totalWithdrawals + calculation.totalExpenses);

      const dailyBalance = await tx.dailyBalance.upsert({
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

      // อัพเดท bankAccount.currentBalance
      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: { currentBalance: actualBalance },
      });

      return dailyBalance;
    });
  }
}
