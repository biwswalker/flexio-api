# Financial System Frontend - API Integration

โปรเจค Next.js TypeScript สำหรับระบบบัญชีการเงินแบบหลายสาขา พร้อม API Services และ React Hooks

## 📁 Project Structure

```
src/
├── types/           # TypeScript interfaces & types
│   ├── api.ts       # Generic API response types
│   ├── auth.ts      # Authentication types
│   ├── branch.ts    # Branch related types
│   ├── user.ts      # User management types
│   ├── bankAccount.ts # Bank account types
│   ├── transaction.ts # Transaction types
│   └── dailyBalance.ts # Daily balance types
├── utils/           # Utility functions
│   ├── axios.ts     # Axios configuration & interceptors
│   ├── query-params.ts # URL query parameter builder
│   └── error-handler.ts # API error handling
├── services/        # API service classes
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── branch.service.ts
│   ├── bank-account.service.ts
│   ├── transaction.service.ts
│   ├── daily-balance.service.ts
│   └── index.ts
├── hooks/           # React hooks
│   ├── useAuth.ts
│   ├── useApi.ts    # Generic API hook
│   ├── useUsers.ts
│   ├── useBranches.ts
│   ├── useTransactions.ts
│   ├── useDailyBalance.ts
│   └── index.ts
├── contexts/        # React contexts
│   └── AuthContext.tsx
└── components/      # Reusable components
    └── ProtectedRoute.tsx
```

## 🚀 Getting Started

### 1. Installation

```bash
npm install axios date-fns
npm install -D @types/node typescript
```

### 2. Environment Variables

สร้างไฟล์ `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 3. Setup in your app

```typescript
// app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## 📖 API Services Usage

### Authentication

```typescript
import { AuthService } from '@/services';

// Login
const loginResponse = await AuthService.login({
  username: 'admin',
  password: 'admin123'
});

// Logout
await AuthService.logout();

// Check authentication status
const isAuthenticated = AuthService.isAuthenticated();
const currentUser = AuthService.getCurrentUser();
```

### Branches Management

```typescript
import { BranchService } from '@/services';
import { BranchType } from '@/types/branch';

// Get all branches
const branchesResponse = await BranchService.getBranches({
  page: 1,
  limit: 10,
  isActive: true
});

// Create branch
const newBranch = await BranchService.createBranch({
  code: 'BR001',
  name: 'Branch 1',
  type: BranchType.SUB,
  address: '123 Main St',
  phone: '02-123-4567'
});

// Update branch
const updatedBranch = await BranchService.updateBranch('branch-id', {
  name: 'Updated Branch Name'
});
```

### Transactions

```typescript
import { TransactionService } from '@/services';
import { TransactionType } from '@/types/transaction';

// Get transactions
const transactionsResponse = await TransactionService.getTransactions({
  bankAccountId: 'account-id',
  date: '2024-01-15',
  page: 1,
  limit: 50
});

// Create transaction
const newTransaction = await TransactionService.createTransaction({
  transactionDate: '2024-01-15',
  transactionTime: '14:30:00',
  type: TransactionType.DEPOSIT,
  amount: 10000,
  bankAccountId: 'account-id',
  note: 'Customer deposit'
});
```

## 🎣 React Hooks Usage

### useAuth Hook

```typescript
import { useAuth } from '@/hooks/useAuth';

function LoginComponent() {
  const { user, isLoading, login, logout, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ username: 'admin', password: 'admin123' });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.name}!</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      )}
    </div>
  );
}
```

### useBranches Hook

```typescript
import { useBranches } from '@/hooks/useBranches';
import { useEffect } from 'react';

function BranchesComponent() {
  const {
    branches,
    isLoadingBranches,
    isCreating,
    getBranches,
    createBranch,
    branchesError
  } = useBranches();

  useEffect(() => {
    getBranches({ page: 1, limit: 10 });
  }, [getBranches]);

  const handleCreateBranch = async () => {
    try {
      await createBranch({
        code: 'BR002',
        name: 'New Branch',
        type: BranchType.SUB
      });
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  };

  if (isLoadingBranches) return <div>Loading...</div>;
  if (branchesError) return <div>Error: {branchesError.message}</div>;

  return (
    <div>
      <button onClick={handleCreateBranch} disabled={isCreating}>
        {isCreating ? 'Creating...' : 'Create Branch'}
      </button>
      
      {branches.map(branch => (
        <div key={branch.id}>
          <h3>{branch.name}</h3>
          <p>Code: {branch.code}</p>
          <p>Type: {branch.type}</p>
        </div>
      ))}
    </div>
  );
}
```

### useTransactions Hook

```typescript
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionType } from '@/types/transaction';

function TransactionsComponent() {
  const {
    transactions,
    isLoadingTransactions,
    getTransactions,
    createTransaction,
    transactionsError
  } = useTransactions();

  const handleCreateTransaction = async () => {
    try {
      await createTransaction({
        transactionDate: '2024-01-15',
        transactionTime: '14:30:00',
        type: TransactionType.DEPOSIT,
        amount: 5000,
        bankAccountId: 'account-id',
        note: 'Test transaction'
      });
      
      // Refresh transactions
      await getTransactions({ bankAccountId: 'account-id' });
    } catch (error) {
      console.error('Failed to create transaction:', error);
    }
  };

  return (
    <div>
      <button onClick={handleCreateTransaction}>
        Create Transaction
      </button>
      
      {transactions.map(transaction => (
        <div key={transaction.id}>
          <p>Type: {transaction.type}</p>
          <p>Amount: {transaction.amount.toLocaleString()}</p>
          <p>Time: {transaction.transactionTime}</p>
        </div>
      ))}
    </div>
  );
}
```

## 🔐 Protected Routes

```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserRole } from '@/types/auth';

// Protect entire page
export default function AdminPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
      <div>Admin only content</div>
    </ProtectedRoute>
  );
}

// Protect specific components
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.BRANCH_MANAGER]}>
        <div>Manager level content</div>
      </ProtectedRoute>
    </div>
  );
}
```

## 🔧 Error Handling

ทุก API call จะ handle errors อัตโนมัติ:

```typescript
import { handleApiError } from '@/utils/error-handler';

try {
  await SomeService.someMethod();
} catch (error) {
  const apiError = handleApiError(error);
  console.log('Error code:', apiError.code);
  console.log('Error message:', apiError.message);
  console.log('Field:', apiError.field); // สำหรับ validation errors
}
```

## 🎨 Customization

### แก้ไข API Base URL

```typescript
// utils/axios.ts
const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  // ... other config
});
```

### เพิ่ม Custom Headers

```typescript
// utils/axios.ts
this.instance.interceptors.request.use((config) => {
  const token = this.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // เพิ่ม custom headers
  config.headers['X-Client-Version'] = '1.0.0';
  
  return config;
});
```

### Custom Error Handling

```typescript
// utils/error-handler.ts
export const handleApiError = (error: unknown): ApiError => {
  // Custom error handling logic
  
  if (error instanceof AxiosError) {
    // Handle specific error codes
    if (error.response?.status === 422) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Please check your input',
        details: error.response.data
      };
    }
  }
  
  return defaultErrorHandler(error);
};
```

## 📝 Additional Notes

- **Token Management**: Tokens จะถูกเก็บใน localStorage และจัดการอัตโนมัติ
- **Error Boundaries**: ควรใช้ Error Boundaries เพื่อ catch errors ที่ component level
- **Loading States**: ทุก hook มี loading states ให้ใช้งาน
- **Type Safety**: ทุก API response มี TypeScript types ครบถ้วน
- **Pagination**: Support pagination ในหน้าที่ต้องการ

## 🔄 Data Flow

1. **API Service** → ทำการเรียก HTTP requests
2. **React Hook** → จัดการ state และ data transformation  
3. **Component** → แสดงผลและจัดการ user interactions
4. **Context** → จัดการ global state (เช่น authentication)

ระบบนี้ถูกออกแบบให้ maintainable, type-safe และง่ายต่อการขยาย สามารถเพิ่ม features ใหม่ได้โดยไม่กระทบกับโค้ดเดิม