import { registerExportSource } from '../exportRegistry';
import { useSpending } from '@/store/useSpending';
import type { Transaction, BankAccount } from '@/store/useSpending';

interface SpendingExportData {
  accounts: BankAccount[];
  transactions: Transaction[];
}

registerExportSource<SpendingExportData>({
  id: 'spending',
  name: 'Spending Tracker',
  description: 'Bank accounts and transactions',
  priority: 85,

  export: async (userId: string) => {
    const { accounts, transactions } = useSpending.getState();
    return [{
      accounts,
      transactions,
    }];
  },

  import: async (userId: string, data: SpendingExportData[]) => {
    const { addAccount, addTransaction } = useSpending.getState();
    const imported: string[] = [];

    // Handle array format
    const spendingData = data[0] || { accounts: [], transactions: [] };

    // Import accounts first
    for (const account of spendingData.accounts || []) {
      try {
        const { id, createdAt, updatedAt, ...accountData } = account;
        const newId = await addAccount(accountData);
        imported.push(newId);
      } catch (error) {
        console.error('Failed to import account:', error);
      }
    }

    // Import transactions
    for (const transaction of spendingData.transactions || []) {
      try {
        const { id, createdAt, updatedAt, ...transactionData } = transaction;
        const newId = await addTransaction(transactionData);
        imported.push(newId);
      } catch (error) {
        console.error('Failed to import transaction:', error);
      }
    }

    return imported;
  },

  validate: (data: SpendingExportData[]) => {
    const errors: string[] = [];
    const spendingData = data[0];

    if (!spendingData) {
      errors.push('No spending data found');
      return errors;
    }

    if (!spendingData.accounts || !Array.isArray(spendingData.accounts)) {
      errors.push('Missing or invalid accounts array');
    }

    if (!spendingData.transactions || !Array.isArray(spendingData.transactions)) {
      errors.push('Missing or invalid transactions array');
    }

    return errors;
  },

  transformExport: (data: SpendingExportData[]) => {
    const spendingData = data[0];
    if (!spendingData) return data;

    // Remove sensitive data if needed
    return [{
      accounts: spendingData.accounts.map(a => ({
        ...a,
        // Keep last 4 digits only
        lastFourDigits: a.lastFourDigits,
      })),
      transactions: spendingData.transactions,
    }];
  },
});
