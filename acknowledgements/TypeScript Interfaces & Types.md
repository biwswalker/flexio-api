```ts
// types/api.ts
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

export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// types/auth.ts
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  branches: Branch[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  BRANCH_USER = 'BRANCH_USER'
}

// types/branch.ts
export interface Branch {
  id: string;
  code: string;
  name: string;
  type: BranchType;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  accountCount?: number;
  stats?: {
    bankAccountsCount: number;
    usersCount: number;
  };
  bankAccounts?: BankAccount[];
}

export enum BranchType {
  MAIN = 'MAIN',
  SUB = 'SUB'
}

export interface CreateBranchRequest {
  code: string;
  name: string;
  type: BranchType;
  address?: string;
  phone?: string;
}

export interface UpdateBranchRequest {
  name?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

// types/user.ts
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  branchIds?: string[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface AssignUserBranchesRequest {
  branchIds: string[];
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// types/bankAccount.ts
export interface BankAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  branchId: string;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface CreateBankAccountRequest {
  accountNumber: string;
  accountName: string;
  bankName: string;
  branchId: string;
  currentBalance?: number;
}

export interface UpdateBankAccountRequest {
  accountName?: string;
  bankName?: string;
  isActive?: boolean;
}

export interface BankAccountsResponse {
  accounts: BankAccount[];
}

// types/transaction.ts
export interface Transaction {
  id: string;
  transactionDate: string;
  transactionTime: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  note?: string;
  referenceNumber?: string;
  bankAccountId: string;
  categoryId?: string;
  createdBy: string;
  relatedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  };
  bankAccount?: {
    id: string;
    accountNumber: string;
    accountName: string;
  };
  user?: {
    id: string;
    name: string;
  };
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER'
}

export interface CreateTransactionRequest {
  transactionDate: string;
  transactionTime: string;
  type: TransactionType;
  amount: number;
  bankAccountId: string;
  categoryId?: string;
  note?: string;
  transferToBankAccountId?: string;
}

export interface UpdateTransactionRequest {
  amount?: number;
  note?: string;
  categoryId?: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TransactionCategory {
  id: string;
  name: string;
  transactionType: TransactionType;
  description?: string;
  isActive: boolean;
}

// types/dailyBalance.ts
export interface DailyBalance {
  id: string;
  balanceDate: string;
  bankAccountId: string;
  openingBalance: number;
  closingBalance: number;
  actualBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalExpenses: number;
  totalTransfers: number;
  unknownDeposits: number;
  profit: number;
  isClosed: boolean;
  closedBy?: string;
  createdAt: string;
  updatedAt: string;
  bankAccount?: {
    id: string;
    accountNumber: string;
    accountName: string;
  };
  user?: {
    id: string;
    name: string;
  };
}

export interface DailyBalanceCalculation {
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalExpenses: number;
  totalTransfers: number;
  transactionCount: number;
}

export interface CloseDailyBalanceRequest {
  bankAccountId: string;
  date: string;
  actualBalance: number;
}

export interface DailyBalancesResponse {
  dailyBalances: DailyBalance[];
}

// types/query.ts
export interface GetUsersQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
}

export interface GetBranchesQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface GetBankAccountsQuery {
  branchId?: string;
  isActive?: boolean;
}

export interface GetTransactionsQuery {
  bankAccountId?: string;
  date?: string;
  type?: TransactionType;
  page?: number;
  limit?: number;
}

export interface GetDailyBalancesQuery {
  bankAccountId?: string;
  date?: string;
  isClosed?: boolean;
}

export interface GetDailyBalanceCalculationQuery {
  bankAccountId: string;
  date: string;
}
```