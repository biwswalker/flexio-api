# Complete Express TypeScript + Prisma Backend Setup

## 🚀 Project Setup Guide

### 1. Initialize Project

```bash
# สร้างโฟลเดอร์โปรเจค
mkdir financial-system-backend
cd financial-system-backend

# Initialize npm
npm init -y

# Install dependencies
npm install express cors helmet morgan dotenv bcryptjs jsonwebtoken
npm install @prisma/client prisma

# Install dev dependencies
npm install -D typescript @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken @types/morgan
npm install -D ts-node nodemon concurrently

# Install additional utilities
npm install express-validator express-rate-limit compression
npm install -D @types/compression
```

### 2. TypeScript Configuration

**tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 3. Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "concurrently \"npm run db:generate\" \"nodemon src/server.ts\"",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "ts-node prisma/seed.ts",
    "db:reset": "prisma migrate reset",
    "postinstall": "prisma generate"
  }
}
```

### 4. Environment Configuration

**.env**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/financial_system?schema=public"

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# App
API_VERSION=v1
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**.env.example**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/financial_system?schema=public"
PORT=3000
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
API_VERSION=v1
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5. Prisma Schema

**prisma/schema.prisma**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  username  String   @unique @db.VarChar(100)
  email     String   @unique @db.VarChar(255)
  password  String   @db.VarChar(255)
  name      String   @db.VarChar(200)
  role      UserRole
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  userBranches  UserBranch[]
  transactions  Transaction[]
  dailyBalances DailyBalance[]
  auditLogs     AuditLog[]

  @@map("users")
}

model UserBranch {
  id       String @id @default(cuid())
  userId   String
  branchId String
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  branch Branch @relation(fields: [branchId], references: [id], onDelete: Cascade)

  @@unique([userId, branchId])
  @@map("user_branches")
}

model Branch {
  id        String     @id @default(cuid())
  code      String     @unique @db.VarChar(10)
  name      String     @db.VarChar(200)
  type      BranchType
  address   String?    @db.Text
  phone     String?    @db.VarChar(20)
  isActive  Boolean    @default(true)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  // Relations
  userBranches UserBranch[]
  bankAccounts BankAccount[]

  @@map("branches")
}

model BankAccount {
  id             String  @id @default(cuid())
  accountNumber  String  @unique @db.VarChar(20)
  accountName    String  @db.VarChar(100)
  bankName       String  @db.VarChar(100)
  branchId       String
  currentBalance Decimal @default(0) @db.Decimal(15, 2)
  isActive       Boolean @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  branch        Branch         @relation(fields: [branchId], references: [id])
  transactions  Transaction[]
  dailyBalances DailyBalance[]

  @@map("bank_accounts")
}

model TransactionCategory {
  id              String          @id @default(cuid())
  name            String          @db.VarChar(100)
  transactionType TransactionType
  description     String?         @db.Text
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  transactions Transaction[]

  @@map("transaction_categories")
}

model Transaction {
  id                    String          @id @default(cuid())
  transactionDate       DateTime        @db.Date
  transactionTime       String          @db.Time
  type                  TransactionType
  amount                Decimal         @db.Decimal(15, 2)
  balanceAfter          Decimal         @db.Decimal(15, 2)
  note                  String?         @db.Text
  referenceNumber       String?         @db.VarChar(50)
  bankAccountId         String
  categoryId            String?
  createdBy             String
  relatedTransactionId  String?         @unique
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  // Relations
  bankAccount       BankAccount          @relation(fields: [bankAccountId], references: [id])
  category          TransactionCategory? @relation(fields: [categoryId], references: [id])
  user              User                 @relation(fields: [createdBy], references: [id])
  relatedTransaction Transaction?        @relation("TransferRelation", fields: [relatedTransactionId], references: [id])
  transferTransaction Transaction?       @relation("TransferRelation")

  @@map("transactions")
}

model DailyBalance {
  id              String   @id @default(cuid())
  balanceDate     DateTime @db.Date
  bankAccountId   String
  openingBalance  Decimal  @db.Decimal(15, 2)
  closingBalance  Decimal  @db.Decimal(15, 2)
  actualBalance   Decimal  @db.Decimal(15, 2)
  totalDeposits   Decimal  @db.Decimal(15, 2)
  totalWithdrawals Decimal @db.Decimal(15, 2)
  totalExpenses   Decimal  @db.Decimal(15, 2)
  totalTransfers  Decimal  @db.Decimal(15, 2)
  unknownDeposits Decimal  @db.Decimal(15, 2)
  profit          Decimal  @db.Decimal(15, 2)
  isClosed        Boolean  @default(false)
  closedBy        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  bankAccount BankAccount @relation(fields: [bankAccountId], references: [id])
  user        User?       @relation(fields: [closedBy], references: [id])

  @@unique([balanceDate, bankAccountId])
  @@map("daily_balances")
}

model AuditLog {
  id         String   @id @default(cuid())
  action     String   @db.VarChar(50)
  entityType String   @db.VarChar(50)
  entityId   String
  oldData    Json?
  newData    Json?
  userId     String
  ipAddress  String?  @db.Inet
  createdAt  DateTime @default(now())

  // Relations
  user User @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}

enum UserRole {
  ADMIN
  BRANCH_MANAGER
  BRANCH_USER
}

enum BranchType {
  MAIN
  SUB
}

enum TransactionType {
  DEPOSIT
  WITHDRAWAL
  EXPENSE
  TRANSFER
}
```

### 6. Prisma Seed Data

**prisma/seed.ts**
```typescript
import { PrismaClient, UserRole, BranchType, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create main branch
  const mainBranch = await prisma.branch.create({
    data: {
      code: 'MAIN001',
      name: 'สาขาหลัก',
      type: BranchType.MAIN,
      address: '123 ถนนหลัก เขตกลาง กรุงเทพฯ 10100',
      phone: '02-123-4567',
    },
  });

  // Create sub branch
  const subBranch = await prisma.branch.create({
    data: {
      code: 'SUB001',
      name: 'สาขาย่อย 1',
      type: BranchType.SUB,
      address: '456 ถนนสาขา เขตย่อย กรุงเทพฯ 10200',
      phone: '02-234-5678',
    },
  });

  // Create another sub branch
  const subBranch2 = await prisma.branch.create({
    data: {
      code: 'SUB002',
      name: 'สาขาย่อย 2',
      type: BranchType.SUB,
      address: '789 ถนนใหม่ เขตเหนือ กรุงเทพฯ 10300',
      phone: '02-345-6789',
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@company.com',
      password: hashedPassword,
      name: 'ผู้ดูแลระบบ',
      role: UserRole.ADMIN,
    },
  });

  // Create branch manager
  const managerUser = await prisma.user.create({
    data: {
      username: 'manager1',
      email: 'manager1@company.com',
      password: hashedPassword,
      name: 'ผู้จัดการสาขา 1',
      role: UserRole.BRANCH_MANAGER,
    },
  });

  // Create branch user
  const branchUser = await prisma.user.create({
    data: {
      username: 'user1',
      email: 'user1@company.com',
      password: hashedPassword,
      name: 'พนักงานสาขา 1',
      role: UserRole.BRANCH_USER,
    },
  });

  // Assign users to branches
  // Admin can access all branches
  await prisma.userBranch.createMany({
    data: [
      { userId: adminUser.id, branchId: mainBranch.id },
      { userId: adminUser.id, branchId: subBranch.id },
      { userId: adminUser.id, branchId: subBranch2.id },
    ],
  });

  // Manager can access main branch and sub branch 1
  await prisma.userBranch.createMany({
    data: [
      { userId: managerUser.id, branchId: mainBranch.id },
      { userId: managerUser.id, branchId: subBranch.id },
    ],
  });

  // Branch user can access only sub branch 1
  await prisma.userBranch.create({
    data: {
      userId: branchUser.id,
      branchId: subBranch.id,
    },
  });

  // Create bank accounts
  const bankAccount1 = await prisma.bankAccount.create({
    data: {
      accountNumber: '1234567890',
      accountName: 'บัญชีหลัก - สาขาหลัก',
      bankName: 'ธนาคารกรุงเทพ',
      branchId: mainBranch.id,
      currentBalance: 100000,
    },
  });

  const bankAccount2 = await prisma.bankAccount.create({
    data: {
      accountNumber: '0987654321',
      accountName: 'บัญชีย่อย - สาขาย่อย 1',
      bankName: 'ธนาคารกสิกร',
      branchId: subBranch.id,
      currentBalance: 50000,
    },
  });

  const bankAccount3 = await prisma.bankAccount.create({
    data: {
      accountNumber: '1122334455',
      accountName: 'บัญชีย่อย - สาขาย่อย 2',
      bankName: 'ธนาคารไทยพาณิชย์',
      branchId: subBranch2.id,
      currentBalance: 75000,
    },
  });

  // Create transaction categories
  await prisma.transactionCategory.createMany({
    data: [
      {
        name: 'ถอนให้ลูกค้า',
        transactionType: TransactionType.WITHDRAWAL,
        description: 'การถอนเงินให้ลูกค้า',
      },
      {
        name: 'ค่าไฟออฟฟิศ',
        transactionType: TransactionType.EXPENSE,
        description: 'ค่าไฟฟ้าของออฟฟิศ',
      },
      {
        name: 'ค่าน้ำออฟฟิศ',
        transactionType: TransactionType.EXPENSE,
        description: 'ค่าน้ำประปาของออฟฟิศ',
      },
      {
        name: 'เบิกล่วงหน้า',
        transactionType: TransactionType.EXPENSE,
        description: 'การเบิกเงินล่วงหน้า',
      },
      {
        name: 'เงินเก็บ',
        transactionType: TransactionType.TRANSFER,
        description: 'การโอนเงินเก็บ',
      },
      {
        name: 'เงินพัก',
        transactionType: TransactionType.TRANSFER,
        description: 'การโอนเงินพัก',
      },
    ],
  });

  console.log('✅ Seed completed successfully');
  console.log(`👤 Admin: username=admin, password=admin123`);
  console.log(`👤 Manager: username=manager1, password=admin123`);
  console.log(`👤 User: username=user1, password=admin123`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 7. Project Structure

```
src/
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── branch.controller.ts
│   ├── bankAccount.controller.ts
│   ├── transaction.controller.ts
│   ├── dailyBalance.controller.ts
│   └── report.controller.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   ├── error.middleware.ts
│   └── audit.middleware.ts
├── routes/
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── branch.routes.ts
│   ├── bankAccount.routes.ts
│   ├── transaction.routes.ts
│   ├── dailyBalance.routes.ts
│   └── report.routes.ts
├── services/
│   ├── auth.service.ts
│   ├── transaction.service.ts
│   ├── dailyBalance.service.ts
│   └── audit.service.ts
├── utils/
│   ├── database.ts
│   ├── logger.ts
│   ├── responses.ts
│   └── calculations.ts
├── types/
│   └── index.ts
├── config/
│   └── index.ts
├── app.ts
└── server.ts
```

### 8. Main Application Files

**src/config/index.ts**
```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
};
```

**src/utils/database.ts**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log('👋 Database disconnected');
}
```

**src/utils/responses.ts**
```typescript
import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    field?: string;
    details?: any;
  };
  timestamp?: string;
  path?: string;
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  field?: string,
  details?: any
): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      field,
      details,
    },
    timestamp: new Date().toISOString(),
    path: res.req.path,
  };
  res.status(statusCode).json(response);
};
```

**src/middleware/auth.middleware.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../utils/database';
import { sendError } from '../utils/responses';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
    branchIds: string[]; // เปลี่ยนจาก branchId เป็น branchIds array
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      sendError(res, 'UNAUTHORIZED', 'Access token required', 401);
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { 
        userBranches: {
          where: { isActive: true },
          include: { branch: true },
        },
      },
    });

    if (!user || !user.isActive) {
      sendError(res, 'UNAUTHORIZED', 'Invalid or inactive user', 401);
      return;
    }

    // ดึง branch IDs ที่ user สามารถเข้าถึงได้
    const branchIds = user.userBranches
      .filter(ub => ub.branch.isActive)
      .map(ub => ub.branchId);

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      branchIds,
    };

    next();
  } catch (error) {
    sendError(res, 'UNAUTHORIZED', 'Invalid access token', 401);
  }
};

export const authorize = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'FORBIDDEN', 'Insufficient permissions', 403);
      return;
    }

    next();
  };
};

// เพิ่ม middleware สำหรับตรวจสอบว่า user มีสิทธิ์เข้าถึงสาขาที่ระบุหรือไม่
export const checkBranchAccess = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  // Admin สามารถเข้าถึงทุกสาขาได้
  if (req.user.role === UserRole.ADMIN) {
    next();
    return;
  }

  const branchId = req.params.branchId || req.query.branchId || req.body.branchId;
  
  if (branchId && !req.user.branchIds.includes(branchId as string)) {
    sendError(res, 'FORBIDDEN', 'Access denied to this branch', 403);
    return;
  }

  next();
};
```

**src/controllers/auth.controller.ts**
```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database';
import { sendSuccess, sendError } from '../utils/responses';
import { config } from '../config';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      sendError(res, 'VALIDATION_ERROR', 'Username and password are required');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        userBranches: {
          where: { isActive: true },
          include: {
            branch: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      sendError(res, 'INVALID_CREDENTIALS', 'Invalid username or password', 401);
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      sendError(res, 'INVALID_CREDENTIALS', 'Invalid username or password', 401);
      return;
    }

    // ดึงเฉพาะ branches ที่ active
    const activeBranches = user.userBranches
      .filter(ub => ub.branch.isActive)
      .map(ub => ub.branch);

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    sendSuccess(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        branches: activeBranches,
        isActive: user.isActive,
      },
      token,
      expiresIn: config.jwt.expiresIn,
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Internal server error', 500);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, null, 'Logout successful');
};
```

**src/app.ts**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { connectDatabase } from './utils/database';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import branchRoutes from './routes/branch.routes';
import bankAccountRoutes from './routes/bankAccount.routes';
import transactionRoutes from './routes/transaction.routes';
import dailyBalanceRoutes from './routes/dailyBalance.routes';
import reportRoutes from './routes/report.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP',
    },
  },
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging middleware
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/daily-balances', dailyBalanceRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
    path: req.path,
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database connection
connectDatabase();

export default app;
```

**src/server.ts**
```typescript
import app from './app';
import { config } from './config';
import { disconnectDatabase } from './utils/database';

const server = app.listen(config.port, () => {
  console.log(`
🚀 Server is running on port ${config.port}
📊 Environment: ${config.nodeEnv}
🌐 Health check: http://localhost:${config.port}/health
📚 Database: Connected
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Received SIGINT. Shutting down gracefully...');
  
  server.close(async () => {
    console.log('✅ HTTP server closed');
    await disconnectDatabase();
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('👋 Received SIGTERM. Shutting down gracefully...');
  
  server.close(async () => {
    console.log('✅ HTTP server closed');
    await disconnectDatabase();
    process.exit(0);
  });
});

export default server;
```

## 🛠 Setup Instructions

### 1. Setup PostgreSQL Database

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE financial_system;
CREATE USER your_username WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE financial_system TO your_username;
\q
```

### 2. Initialize Project

```bash
# Clone/create project directory
git clone <your-repo> # or create new directory
cd financial-system-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client and run migrations
npx prisma generate
npx prisma db push

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

### 3. Development Commands

```bash
# Development with hot reload
npm run dev

# Database operations
npm run db:studio          # Open Prisma Studio
npm run db:migrate         # Create and apply migration
npm run db:push           # Push schema changes without migration
npm run db:reset          # Reset database with fresh data

# Production
npm run build
npm start
```

### 4. Auto Migration Setup

Prisma มี auto migration ในแบบต่างๆ:

1. **Development**: `prisma db push` - ใช้สำหรับการพัฒนา
2. **Production**: `prisma migrate deploy` - ใช้สำหรับ production
3. **Generate Migration**: `prisma migrate dev --name description` - สร้าง migration file

เพิ่มใน `package.json`:
```json
{
  "scripts": {
    "deploy": "prisma migrate deploy && npm start",
    "dev:migrate": "prisma migrate dev && npm run dev"
  }
}
```

### 9. Error Middleware

**src/middleware/error.middleware.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/responses';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        sendError(res, 'DUPLICATE_ENTRY', 'Duplicate entry found', 409);
        return;
      case 'P2025':
        sendError(res, 'NOT_FOUND', 'Record not found', 404);
        return;
      case 'P2003':
        sendError(res, 'FOREIGN_KEY_CONSTRAINT', 'Foreign key constraint failed', 400);
        return;
      default:
        sendError(res, 'DATABASE_ERROR', 'Database error occurred', 500);
        return;
    }
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    sendError(res, 'VALIDATION_ERROR', error.message, 400);
    return;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    sendError(res, 'INVALID_TOKEN', 'Invalid token', 401);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    sendError(res, 'TOKEN_EXPIRED', 'Token expired', 401);
    return;
  }

  // Default error
  sendError(res, 'INTERNAL_ERROR', 'Internal server error', 500);
};
```

**src/middleware/validation.middleware.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/responses';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    sendError(
      res,
      'VALIDATION_ERROR',
      firstError.msg,
      400,
      firstError.param
    );
    return;
  }
  
  next();
};
```

**src/middleware/audit.middleware.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/database';
import { AuthRequest } from './auth.middleware';

export const auditLog = (action: string, entityType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.json;

    res.json = function (body: any) {
      // Log successful operations
      if (body.success && req.user) {
        const entityId = req.params.id || body.data?.id;
        
        if (entityId) {
          prisma.auditLog.create({
            data: {
              action,
              entityType,
              entityId,
              newData: body.data,
              userId: req.user.id,
              ipAddress: req.ip,
            },
          }).catch(console.error);
        }
      }

      return originalSend.call(this, body);
    };

    next();
  };
};
```

### 10. Controllers

**src/controllers/branch.controller.ts**
```typescript
import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../utils/database';
import { sendSuccess, sendError } from '../utils/responses';
import { AuthRequest } from '../middleware/auth.middleware';

export const getBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      // ถ้าไม่ใช่ Admin ให้ดูเฉพาะสาขาที่ตัวเองเข้าถึงได้
      ...(req.user?.role !== UserRole.ADMIN && { 
        id: { in: req.user?.branchIds || [] }
      }),
    };

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          _count: {
            select: { bankAccounts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.branch.count({ where }),
    ]);

    const formattedBranches = branches.map(branch => ({
      id: branch.id,
      code: branch.code,
      name: branch.name,
      type: branch.type,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
      accountCount: branch._count.bankAccounts,
      createdAt: branch.createdAt,
    }));

    sendSuccess(res, {
      branches: formattedBranches,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get branches error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch branches', 500);
  }
};

export const getBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // ตรวจสอบสิทธิ์การเข้าถึง
    const where = {
      id,
      // ถ้าไม่ใช่ Admin ให้ดูเฉพาะสาขาที่ตัวเองเข้าถึงได้
      ...(req.user?.role !== UserRole.ADMIN && { 
        id: { in: req.user?.branchIds || [] }
      }),
    };

    const branch = await prisma.branch.findFirst({
      where,
      include: {
        _count: {
          select: { 
            bankAccounts: true,
            userBranches: { where: { isActive: true } }
          },
        },
        bankAccounts: {
          where: { isActive: true },
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            bankName: true,
            currentBalance: true,
            isActive: true,
          },
        },
      },
    });

    if (!branch) {
      sendError(res, 'BRANCH_NOT_FOUND', 'Branch not found or access denied', 404);
      return;
    }

    const formattedBranch = {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      type: branch.type,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
      stats: {
        bankAccountsCount: branch._count.bankAccounts,
        usersCount: branch._count.userBranches,
      },
      bankAccounts: branch.bankAccounts,
    };

    sendSuccess(res, formattedBranch);
  } catch (error) {
    console.error('Get branch error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch branch', 500);
  }
};

export const createBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, type, address, phone } = req.body;

    const existingBranch = await prisma.branch.findUnique({
      where: { code },
    });

    if (existingBranch) {
      sendError(res, 'BRANCH_CODE_EXISTS', 'Branch code already exists', 409, 'code');
      return;
    }

    const branch = await prisma.branch.create({
      data: {
        code,
        name,
        type,
        address,
        phone,
      },
    });

    sendSuccess(res, branch, 'Branch created successfully', 201);
  } catch (error) {
    console.error('Create branch error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to create branch', 500);
  }
};

export const updateBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address, phone, isActive } = req.body;

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        address,
        phone,
        isActive,
      },
    });

    sendSuccess(res, branch, 'Branch updated successfully');
  } catch (error) {
    console.error('Update branch error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to update branch', 500);
  }
};

export const deleteBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // ตรวจสอบว่ามี bank accounts หรือ users ที่เชื่อมโยงหรือไม่
    const branchUsage = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bankAccounts: true,
            userBranches: { where: { isActive: true } },
          },
        },
      },
    });

    if (!branchUsage) {
      sendError(res, 'BRANCH_NOT_FOUND', 'Branch not found', 404);
      return;
    }

    if (branchUsage._count.bankAccounts > 0 || branchUsage._count.userBranches > 0) {
      sendError(res, 'BRANCH_IN_USE', 'Cannot delete branch that has bank accounts or users assigned', 400);
      return;
    }

    // Soft delete by setting isActive to false
    await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });

    sendSuccess(res, null, 'Branch deleted successfully');
  } catch (error) {
    console.error('Delete branch error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to delete branch', 500);
  }
};
```

**src/controllers/bankAccount.controller.ts**
```typescript
import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../utils/database';
import { sendSuccess, sendError } from '../utils/responses';
import { AuthRequest } from '../middleware/auth.middleware';

export const getBankAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branchId, isActive } = req.query;

    const where = {
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(branchId && { branchId: branchId as string }),
      // ถ้าไม่ใช่ Admin ให้ดูเฉพาะบัญชีในสาขาที่ตัวเองเข้าถึงได้
      ...(req.user?.role !== UserRole.ADMIN && { 
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
    const { accountNumber, accountName, bankName, branchId, currentBalance = 0 } = req.body;

    const existingAccount = await prisma.bankAccount.findUnique({
      where: { accountNumber },
    });

    if (existingAccount) {
      sendError(res, 'ACCOUNT_NUMBER_EXISTS', 'Account number already exists', 409, 'accountNumber');
      return;
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountNumber,
        accountName,
        bankName,
        branchId,
        currentBalance,
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
    const { accountName, bankName, isActive } = req.body;

    const bankAccount = await prisma.bankAccount.update({
      where: { id },
      data: {
        accountName,
        bankName,
        isActive,
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
```

**src/controllers/transaction.controller.ts**
```typescript
import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../utils/database';
import { sendSuccess, sendError } from '../utils/responses';
import { AuthRequest } from '../middleware/auth.middleware';
import { TransactionService } from '../services/transaction.service';

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      bankAccountId, 
      date, 
      type, 
      page = 1, 
      limit = 50 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(bankAccountId && { bankAccountId: bankAccountId as string }),
      ...(date && { transactionDate: new Date(date as string) }),
      ...(type && { type }),
      // ถ้าไม่ใช่ Admin ให้ดูเฉพาะรายการในสาขาที่ตัวเองเข้าถึงได้
      ...(req.user?.role !== UserRole.ADMIN && {
        bankAccount: { branchId: { in: req.user?.branchIds || [] } },
      }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          category: {
            select: { id: true, name: true },
          },
          bankAccount: {
            select: { id: true, accountNumber: true, accountName: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { transactionDate: 'desc' },
          { transactionTime: 'desc' },
        ],
      }),
      prisma.transaction.count({ where }),
    ]);

    sendSuccess(res, {
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch transactions', 500);
  }
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      transactionDate,
      transactionTime,
      type,
      amount,
      bankAccountId,
      categoryId,
      note,
      transferToBankAccountId,
    } = req.body;

    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
      return;
    }

    const result = await TransactionService.createTransaction({
      transactionDate: new Date(transactionDate),
      transactionTime,
      type,
      amount: parseFloat(amount),
      bankAccountId,
      categoryId,
      note,
      transferToBankAccountId,
      createdBy: req.user.id,
    });

    sendSuccess(res, result, 'Transaction created successfully', 201);
  } catch (error) {
    console.error('Create transaction error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('INSUFFICIENT_BALANCE')) {
        sendError(res, 'INSUFFICIENT_BALANCE', error.message, 400);
        return;
      }
      if (error.message.includes('ACCOUNT_NOT_FOUND')) {
        sendError(res, 'ACCOUNT_NOT_FOUND', error.message, 404);
        return;
      }
    }
    
    sendError(res, 'INTERNAL_ERROR', 'Failed to create transaction', 500);
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, note, categoryId } = req.body;

    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
      return;
    }

    const result = await TransactionService.updateTransaction(
      id,
      { amount: amount ? parseFloat(amount) : undefined, note, categoryId },
      req.user.id
    );

    sendSuccess(res, result, 'Transaction updated successfully');
  } catch (error) {
    console.error('Update transaction error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to update transaction', 500);
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
      return;
    }

    await TransactionService.deleteTransaction(id, req.user.id);
    sendSuccess(res, null, 'Transaction deleted successfully');
  } catch (error) {
    console.error('Delete transaction error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to delete transaction', 500);
  }
};
```

**src/controllers/dailyBalance.controller.ts**
```typescript
import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { sendSuccess, sendError } from '../utils/responses';
import { AuthRequest } from '../middleware/auth.middleware';
import { DailyBalanceService } from '../services/dailyBalance.service';

export const getDailyBalances = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bankAccountId, date, isClosed } = req.query;

    const where = {
      ...(bankAccountId && { bankAccountId: bankAccountId as string }),
      ...(date && { balanceDate: new Date(date as string) }),
      ...(isClosed !== undefined && { isClosed: isClosed === 'true' }),
      // ถ้าไม่ใช่ Admin ให้ดูเฉพาะยอดในสาขาที่ตัวเองเข้าถึงได้
      ...(req.user?.role !== 'ADMIN' && {
        bankAccount: { branchId: { in: req.user?.branchIds || [] } },
      }),
    };

    const dailyBalances = await prisma.dailyBalance.findMany({
      where,
      include: {
        bankAccount: {
          select: { id: true, accountNumber: true, accountName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { balanceDate: 'desc' },
    });

    sendSuccess(res, { dailyBalances });
  } catch (error) {
    console.error('Get daily balances error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch daily balances', 500);
  }
};

export const closeDailyBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bankAccountId, date, actualBalance } = req.body;

    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
      return;
    }

    const dailyBalance = await DailyBalanceService.closeDailyBalance(
      bankAccountId,
      new Date(date),
      parseFloat(actualBalance),
      req.user.id
    );

    sendSuccess(res, { dailyBalance }, 'Daily balance closed successfully');
  } catch (error) {
    console.error('Close daily balance error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ALREADY_CLOSED')) {
        sendError(res, 'DAILY_BALANCE_CLOSED', error.message, 400);
        return;
      }
    }
    
    sendError(res, 'INTERNAL_ERROR', 'Failed to close daily balance', 500);
  }
};

export const getDailyBalanceCalculation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bankAccountId, date } = req.query;

    if (!bankAccountId || !date) {
      sendError(res, 'VALIDATION_ERROR', 'Bank account ID and date are required');
      return;
    }

    const calculation = await DailyBalanceService.calculateDailyBalance(
      bankAccountId as string,
      new Date(date as string)
    );

    sendSuccess(res, calculation);
  } catch (error) {
    console.error('Get daily balance calculation error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to calculate daily balance', 500);
  }
};
```

### 11. Services

**src/services/transaction.service.ts**
```typescript
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
    return await prisma.$transaction(async (tx) => {
      // Check bank account exists
      const bankAccount = await tx.bankAccount.findUnique({
        where: { id: input.bankAccountId },
      });

      if (!bankAccount) {
        throw new Error('ACCOUNT_NOT_FOUND: Bank account not found');
      }

      // Check sufficient balance for withdrawal, expense, and transfer
      if (['WITHDRAWAL', 'EXPENSE', 'TRANSFER'].includes(input.type)) {
        if (bankAccount.currentBalance < input.amount) {
          throw new Error(`INSUFFICIENT_BALANCE: Current balance: ${bankAccount.currentBalance}, Requested: ${input.amount}`);
        }
      }

      // Calculate new balance
      let newBalance = bankAccount.currentBalance;
      if (input.type === 'DEPOSIT') {
        newBalance += input.amount;
      } else {
        newBalance -= input.amount;
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

        const targetNewBalance = targetAccount.currentBalance + input.amount;

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
        const amountDifference = updates.amount - existingTransaction.amount;
        
        let newBalance = existingTransaction.bankAccount.currentBalance;
        if (existingTransaction.type === 'DEPOSIT') {
          newBalance += amountDifference;
        } else {
          newBalance -= amountDifference;
        }

        if (newBalance < 0) {
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
        newBalance -= transaction.amount;
      } else {
        newBalance += transaction.amount;
      }

      if (newBalance < 0) {
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
```

**src/services/dailyBalance.service.ts**
```typescript
import { prisma } from '../utils/database';
import { Decimal } from '@prisma/client/runtime/library';

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
          case 'DEPOSIT':
            acc.totalDeposits += amount;
            break;
          case 'WITHDRAWAL':
            acc.totalWithdrawals += amount;
            break;
          case 'EXPENSE':
            acc.totalExpenses += amount;
            break;
          case 'TRANSFER':
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
    const closingBalance = Number(openingBalance) + totals.totalDeposits - totals.totalWithdrawals - totals.totalExpenses - totals.totalTransfers;

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
      throw new Error('ALREADY_CLOSED: Daily balance for this date is already closed');
    }

    // Calculate daily totals
    const calculation = await this.calculateDailyBalance(bankAccountId, date);

    // Calculate unknown deposits and profit using business logic
    const totalOutflow = calculation.totalWithdrawals + calculation.totalExpenses + calculation.totalTransfers;
    const totalKnownDeposits = calculation.totalDeposits;
    const balanceChange = actualBalance - calculation.openingBalance;
    
    // รวมยอดฝากทั้งหมด = (ถอน + ค่าใช้จ่าย + โอน) + (ยอดคงเหลือสิ้นวัน - ยอดยกมา)
    const totalAllDeposits = totalOutflow + balanceChange;
    
    // รวมยอดฝากที่ไม่รู้ = รวมยอดฝากทั้งหมด - ฝากที่บันทึกไว้
    const unknownDeposits = totalAllDeposits - totalKnownDeposits;
    
    // กำไร = รวมยอดฝากที่ไม่รู้ - (ถอน + ค่าใช้จ่าย)
    const profit = unknownDeposits - (calculation.totalWithdrawals + calculation.totalExpenses);

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
```

**src/controllers/user.controller.ts**
```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/database';
import { sendSuccess, sendError } from '../utils/responses';
import { AuthRequest } from '../middleware/auth.middleware';

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(role && { role }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          userBranches: {
            where: { isActive: true },
            include: {
              branch: {
                select: { id: true, name: true, code: true, type: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map(user => ({
      ...user,
      branches: user.userBranches.map(ub => ub.branch),
      userBranches: undefined, // ไม่ต้องส่ง userBranches ออกไป
    }));

    sendSuccess(res, {
      users: formattedUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch users', 500);
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, name, role, branchIds = [] } = req.body;

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      sendError(res, 'USERNAME_EXISTS', 'Username already exists', 409, 'username');
      return;
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      sendError(res, 'EMAIL_EXISTS', 'Email already exists', 409, 'email');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          name,
          role,
        },
      });

      // Assign branches if provided
      if (branchIds.length > 0) {
        await tx.userBranch.createMany({
          data: branchIds.map((branchId: string) => ({
            userId: user.id,
            branchId,
          })),
        });
      }

      return user;
    });

    // Fetch user with branches
    const userWithBranches = await prisma.user.findUnique({
      where: { id: result.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        userBranches: {
          where: { isActive: true },
          include: {
            branch: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });

    sendSuccess(res, {
      ...userWithBranches,
      branches: userWithBranches?.userBranches.map(ub => ub.branch),
      userBranches: undefined,
    }, 'User created successfully', 201);
  } catch (error) {
    console.error('Create user error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to create user', 500);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    // Check if email already exists (excluding current user)
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (existingEmail) {
        sendError(res, 'EMAIL_EXISTS', 'Email already exists', 409, 'email');
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
        userBranches: {
          where: { isActive: true },
          include: {
            branch: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });

    sendSuccess(res, {
      ...user,
      branches: user.userBranches.map(ub => ub.branch),
      userBranches: undefined,
    }, 'User updated successfully');
  } catch (error) {
    console.error('Update user error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to update user', 500);
  }
};

export const assignUserToBranches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { branchIds } = req.body;

    if (!Array.isArray(branchIds)) {
      sendError(res, 'VALIDATION_ERROR', 'branchIds must be an array');
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    // Verify all branches exist
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds } },
    });

    if (branches.length !== branchIds.length) {
      sendError(res, 'BRANCH_NOT_FOUND', 'One or more branches not found', 404);
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Remove existing assignments
      await tx.userBranch.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // Create new assignments
      if (branchIds.length > 0) {
        // Create or reactivate assignments
        for (const branchId of branchIds) {
          await tx.userBranch.upsert({
            where: {
              userId_branchId: { userId, branchId },
            },
            update: { isActive: true },
            create: { userId, branchId },
          });
        }
      }
    });

    // Fetch updated user with branches
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        userBranches: {
          where: { isActive: true },
          include: {
            branch: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });

    sendSuccess(res, {
      ...updatedUser,
      branches: updatedUser?.userBranches.map(ub => ub.branch),
      userBranches: undefined,
    }, 'User branches assigned successfully');
  } catch (error) {
    console.error('Assign user branches error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to assign user branches', 500);
  }
};

export const getUserBranches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const userBranches = await prisma.userBranch.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        branch: {
          select: { id: true, name: true, code: true, type: true, isActive: true },
        },
      },
    });

    const branches = userBranches
      .filter(ub => ub.branch.isActive)
      .map(ub => ub.branch);

    sendSuccess(res, { branches });
  } catch (error) {
    console.error('Get user branches error:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch user branches', 500);
  }
};
```

**src/routes/auth.routes.ts**
```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validateRequest,
  login
);

router.post('/logout', logout);

export default router;
```

**src/routes/branch.routes.ts**
```typescript
import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserRole } from '@prisma/client';
import { 
  getBranches, 
  getBranch, 
  createBranch, 
  updateBranch, 
  deleteBranch 
} from '../controllers/branch.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all branches
router.get('/', getBranches);

// Get single branch by ID
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid branch ID'),
  ],
  validateRequest,
  getBranch
);

// Create new branch (Admin only)
router.post(
  '/',
  authorize([UserRole.ADMIN]),
  [
    body('code').notEmpty().withMessage('Branch code is required'),
    body('name').notEmpty().withMessage('Branch name is required'),
    body('type').isIn(['MAIN', 'SUB']).withMessage('Invalid branch type'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
  ],
  validateRequest,
  auditLog('CREATE', 'Branch'),
  createBranch
);

// Update branch (Admin only)
router.put(
  '/:id',
  authorize([UserRole.ADMIN]),
  [
    param('id').isUUID().withMessage('Invalid branch ID'),
    body('name').optional().notEmpty().withMessage('Branch name cannot be empty'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],
  validateRequest,
  auditLog('UPDATE', 'Branch'),
  updateBranch
);

// Delete branch (Admin only)
router.delete(
  '/:id',
  authorize([UserRole.ADMIN]),
  [
    param('id').isUUID().withMessage('Invalid branch ID'),
  ],
  validateRequest,
  auditLog('DELETE', 'Branch'),
  deleteBranch
);

export default router;
```

**src/routes/bankAccount.routes.ts**
```typescript
import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserRole } from '@prisma/client';
import { getBankAccounts, createBankAccount, updateBankAccount } from '../controllers/bankAccount.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getBankAccounts);

router.post(
  '/',
  authorize([UserRole.ADMIN, UserRole.BRANCH_MANAGER]),
  [
    body('accountNumber').notEmpty().withMessage('Account number is required'),
    body('accountName').notEmpty().withMessage('Account name is required'),
    body('bankName').notEmpty().withMessage('Bank name is required'),
    body('branchId').isUUID().withMessage('Invalid branch ID'),
    body('currentBalance').optional().isFloat({ min: 0 }).withMessage('Current balance must be a positive number'),
  ],
  validateRequest,
  auditLog('CREATE', 'BankAccount'),
  createBankAccount
);

router.put(
  '/:id',
  authorize([UserRole.ADMIN, UserRole.BRANCH_MANAGER]),
  [
    param('id').isUUID().withMessage('Invalid bank account ID'),
    body('accountName').optional().notEmpty().withMessage('Account name cannot be empty'),
    body('bankName').optional().notEmpty().withMessage('Bank name cannot be empty'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],
  validateRequest,
  auditLog('UPDATE', 'BankAccount'),
  updateBankAccount
);

export default router;
```

**src/routes/transaction.routes.ts**
```typescript
import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserRole } from '@prisma/client';
import { 
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction 
} from '../controllers/transaction.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getTransactions);

router.post(
  '/',
  [
    body('transactionDate').isISO8601().withMessage('Invalid transaction date'),
    body('transactionTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('Invalid time format'),
    body('type').isIn(['DEPOSIT', 'WITHDRAWAL', 'EXPENSE', 'TRANSFER']).withMessage('Invalid transaction type'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('bankAccountId').isUUID().withMessage('Invalid bank account ID'),
    body('categoryId').optional().isUUID().withMessage('Invalid category ID'),
    body('note').optional().isString().withMessage('Note must be a string'),
    body('transferToBankAccountId').optional().isUUID().withMessage('Invalid transfer target bank account ID'),
  ],
  validateRequest,
  auditLog('CREATE', 'Transaction'),
  createTransaction
);

router.put(
  '/:id',
  authorize([UserRole.ADMIN, UserRole.BRANCH_MANAGER]),
  [
    param('id').isUUID().withMessage('Invalid transaction ID'),
    body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('note').optional().isString().withMessage('Note must be a string'),
    body('categoryId').optional().isUUID().withMessage('Invalid category ID'),
  ],
  validateRequest,
  auditLog('UPDATE', 'Transaction'),
  updateTransaction
);

router.delete(
  '/:id',
  authorize([UserRole.ADMIN, UserRole.BRANCH_MANAGER]),
  [
    param('id').isUUID().withMessage('Invalid transaction ID'),
  ],
  validateRequest,
  auditLog('DELETE', 'Transaction'),
  deleteTransaction
);

export default router;
```

**src/routes/dailyBalance.routes.ts**
```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getDailyBalances, 
  closeDailyBalance, 
  getDailyBalanceCalculation 
} from '../controllers/dailyBalance.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getDailyBalances);
router.get('/calculate', getDailyBalanceCalculation);

router.post(
  '/close',
  [
    body('bankAccountId').isUUID().withMessage('Invalid bank account ID'),
    body('date').isISO8601().withMessage('Invalid date'),
    body('actualBalance').isFloat().withMessage('Invalid actual balance'),
  ],
  validateRequest,
  auditLog('CLOSE', 'DailyBalance'),
  closeDailyBalance
);

export default router;
```

**src/routes/report.routes.ts**
```typescript
import { Router } from 'express';
import { query } from 'express-validator';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticateToken);

// เพิ่ม report controllers ภายหลัง
router.get(
  '/daily',
  [
    query('date').isISO8601().withMessage('Invalid date format'),
  ],
  validateRequest,
  (req, res) => {
    res.json({ message: 'Daily report endpoint - Coming soon' });
  }
);

router.get(
  '/monthly',
  [
    query('year').isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  ],
  validateRequest,
  (req, res) => {
    res.json({ message: 'Monthly report endpoint - Coming soon' });
  }
);

export default router;
```

## 🎯 Key Features

✅ **Auto Migration** - Prisma จัดการ database schema อัตโนมัติ  
✅ **Type Safety** - TypeScript + Prisma Client รับประกันความถูกต้องของข้อมูล  
✅ **Security** - JWT authentication, bcrypt password hashing, rate limiting  
✅ **Validation** - Express-validator สำหรับตรวจสอบข้อมูล  
✅ **Error Handling** - Centralized error handling  
✅ **Logging** - Morgan logging + custom logger  
✅ **Database Studio** - Prisma Studio สำหรับจัดการข้อมูล  
✅ **Hot Reload** - Nodemon สำหรับการพัฒนา  
✅ **Complete API** - Controllers, Routes, Services, Middleware ครบถ้วน  
✅ **Business Logic** - Transaction service พร้อม transfer logic และ daily balance calculation  
✅ **Audit Trail** - บันทึกการเปลี่ยนแปลงข้อมูลทั้งหมด  
✅ **Multi-Branch Access** - User สามารถเข้าถึงได้หลายสาขา  
✅ **User Management** - จัดการผู้ใช้และการ assign สาขา  

## 🔄 **Database Changes Summary**

### Updated User Model:
- ✅ เปลี่ยนจาก `firstName`, `lastName` เป็น `name`
- ✅ ลบ `branchId` field (ไม่ต้องผูกกับสาขาเดียว)
- ✅ เพิ่ม many-to-many relationship กับ Branch ผ่าน UserBranch table

### New UserBranch Model:
- ✅ Junction table สำหรับ User-Branch relationship
- ✅ มี `isActive` field สำหรับ soft delete
- ✅ User สามารถเข้าถึงได้หลายสาขา

## 📋 **New API Endpoints**

### User Management APIs (Admin Only)

#### GET /api/users
**Description**: ดูรายการผู้ใช้ทั้งหมด (Admin เท่านั้น)
```typescript
// Response
{
  success: true,
  data: {
    users: Array<{
      id: string,
      username: string,
      email: string,
      name: string,
      role: string,
      isActive: boolean,
      branches: Array<{
        id: string,
        name: string,
        code: string,
        type: string
      }>,
      createdAt: string
    }>,
    pagination: { page: number, limit: number, total: number, totalPages: number }
  }
}
```

#### POST /api/users
**Description**: สร้างผู้ใช้ใหม่ (Admin เท่านั้น)
```typescript
// Request
{
  username: string,
  email: string,
  password: string,
  name: string,
  role: "ADMIN" | "BRANCH_MANAGER" | "BRANCH_USER",
  branchIds?: string[] // สาขาที่ต้องการ assign
}

// Response
{
  success: true,
  data: {
    id: string,
    username: string,
    email: string,
    name: string,
    role: string,
    isActive: boolean,
    branches: Array<Branch>
  },
  message: "User created successfully"
}
```

#### PUT /api/users/:id
**Description**: แก้ไขข้อมูลผู้ใช้ (Admin เท่านั้น)
```typescript
// Request
{
  name?: string,
  email?: string,
  role?: string,
  isActive?: boolean
}
```

#### PUT /api/users/:userId/branches
**Description**: Assign สาขาให้ผู้ใช้ (Admin เท่านั้น)
```typescript
// Request
{
  branchIds: string[] // รายการ branch IDs ที่ต้องการ assign
}

// Response
{
  success: true,
  data: {
    id: string,
    username: string,
    name: string,
    branches: Array<Branch>
  },
  message: "User branches assigned successfully"
}
```

#### GET /api/users/:userId/branches
**Description**: ดูสาขาที่ผู้ใช้เข้าถึงได้
```typescript
// Response
{
  success: true,
  data: {
    branches: Array<{
      id: string,
      name: string,
      code: string,
      type: string,
      isActive: boolean
    }>
  }
}
```

## 🔐 **Updated Security Model**

### JWT Token Payload:
```typescript
{
  userId: string,
  username: string,
  role: string
  // ไม่มี branchId แล้ว เพราะมีหลายสาขา
}
```

### Auth Middleware Updates:
```typescript
// req.user ตอนนี้มี branchIds แทน branchId
{
  id: string,
  username: string,
  role: string,
  branchIds: string[] // สาขาทั้งหมดที่เข้าถึงได้
}
```

### New Branch Access Control:
- **Admin**: เข้าถึงทุกสาขาได้
- **Branch Manager/User**: เข้าถึงเฉพาะสาขาที่ถูก assign
- **checkBranchAccess middleware**: ตรวจสอบสิทธิ์เข้าถึงสาขา

## 🚀 **Usage Examples**

### 1. Login and Get User Info
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Response จะได้ branches array แทน branch object เดียว
{
  "user": {
    "id": "...",
    "username": "admin",
    "name": "ผู้ดูแลระบบ",
    "role": "ADMIN",
    "branches": [
      { "id": "...", "name": "สาขาหลัก", "code": "MAIN001", "type": "MAIN" },
      { "id": "...", "name": "สาขาย่อย 1", "code": "SUB001", "type": "SUB" },
      { "id": "...", "name": "สาขาย่อย 2", "code": "SUB002", "type": "SUB" }
    ]
  },
  "token": "..."
}
```

### 2. Create User with Multiple Branches
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@company.com",
    "password": "password123",
    "name": "ผู้ใช้ใหม่",
    "role": "BRANCH_USER",
    "branchIds": ["branch-id-1", "branch-id-2"]
  }'
```

### 3. Assign User to Different Branches
```bash
curl -X PUT http://localhost:3000/api/users/USER_ID/branches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchIds": ["new-branch-id-1", "new-branch-id-2"]
  }'
```

ตอนนี้คุณมีโปรเจค Express TypeScript พร้อม Prisma ORM ที่มี auto migration และระบบ User-Branch many-to-many แล้ว! 🎉