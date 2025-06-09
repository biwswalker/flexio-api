import {
  PrismaClient,
  UserRole,
  BranchType,
  TransactionType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Create main branch
  const mainBranch = await prisma.branch.create({
    data: {
      code: "HEADQUARTER",
      name: "Flexio Headquarter",
      type: BranchType.MAIN,
      address: "",
      phone: "0999999999",
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin1234", 10);
  const ownerUser = await prisma.user.create({
    data: {
      username: "owner",
      email: "owner@flexio.site",
      password: hashedPassword,
      name: "เจ้าของระบบ",
      role: UserRole.OWNER,
    },
  });

  // // Create branch manager
  // const managerUser = await prisma.user.create({
  //   data: {
  //     username: 'manager1',
  //     email: 'manager1@flexio.site',
  //     password: hashedPassword,
  //     name: 'ผู้จัดการสาขา 1',
  //     role: UserRole.BRANCH_MANAGER,
  //   },
  // });

  // Assign users to branches
  // Admin can access all branches
  await prisma.userBranch.createMany({
    data: [{ userId: ownerUser.id, branchId: mainBranch.id }],
  });

  // Create transaction categories
  await prisma.transactionCategory.createMany({
    data: [
      {
        name: "ยอดฝากจากลูกค้า",
        transactionType: TransactionType.DEPOSIT,
        description: "ยอดฝากจากลูกค้า",
      },
      {
        name: "อื่นๆ",
        transactionType: TransactionType.DEPOSIT,
        description: "อื่นๆ",
      },
      {
        name: "ยอดถอนให้ลูกค้า",
        transactionType: TransactionType.WITHDRAWAL,
        description: "ยอดถอนให้ลูกค้า",
      },
      {
        name: "ค่าการตลาด",
        transactionType: TransactionType.EXPENSE,
        description: "ค่าการตลาด",
      },
      {
        name: "ค่าดูแลรายเดือน",
        transactionType: TransactionType.EXPENSE,
        description: "ค่าดูแลรายเดือน",
      },
      {
        name: "ค่าระบบ",
        transactionType: TransactionType.EXPENSE,
        description: "ค่าระบบ",
      },
      {
        name: "ค่าธรรมเนียม GW",
        transactionType: TransactionType.EXPENSE,
        description: "ค่าธรรมเนียม GW",
      },
      {
        name: "เงินเดือนพนักงาน",
        transactionType: TransactionType.EXPENSE,
        description: "เงินเดือนพนักงาน",
      },
      {
        name: "commission การตลาด",
        transactionType: TransactionType.EXPENSE,
        description: "commission การตลาด",
      },
      {
        name: "ค่าบัญชี",
        transactionType: TransactionType.EXPENSE,
        description: "ค่าบัญชี",
      },
      {
        name: "อื่นๆ",
        transactionType: TransactionType.EXPENSE,
        description: "อื่นๆ",
      },
      {
        name: "ไบแนน (เงินเก็บ)",
        transactionType: TransactionType.TRANSFER,
        description: "ไบแนน (เงินเก็บ)",
      },
      {
        name: "เงินพัก",
        transactionType: TransactionType.TRANSFER,
        description: "การโอนเงินพัก",
      },
      // {
      //   name: 'โยกย้ายเงินระหว่างบัญชีในบริษัท',
      //   transactionType: TransactionType.TRANSFER,
      //   description: 'โยกย้ายเงินระหว่างบัญชีในบริษัท',
      // },
      // {
      //   name: 'โยกย้ายเงินระหว่างบัญชีต่างบริษัท',
      //   transactionType: TransactionType.TRANSFER,
      //   description: 'โยกย้ายเงินระหว่างบัญชีต่างบริษัท',
      // },
    ],
  });

  console.log("✅ Seed completed successfully");
  console.log(`👤 Owner: username=owner, password=admin1234`);
  // console.log(`👤 Manager: username=manager1, password=admin1234`);
  // console.log(`👤 User: username=user1, password=admin1234`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
