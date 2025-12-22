
import { AppData } from '../types';

const STORAGE_KEY = 'twinx_pos_data';

export const storageService = {
  loadData: (): AppData => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all AppData fields are present after parsing including new HR modules
        return {
          products: parsed.products || [],
          sales: parsed.sales || [],
          expenses: parsed.expenses || [],
          returns: parsed.returns || [],
          drafts: parsed.drafts || [],
          logs: parsed.logs || [],
          partners: parsed.partners || [],
          wholesaleTransactions: parsed.wholesaleTransactions || [],
          drivers: parsed.drivers || [],
          customers: parsed.customers || [],
          // Fix: Ensure HR properties are initialized from storage or defaults
          employees: parsed.employees || [],
          attendance: parsed.attendance || [],
          salaryTransactions: parsed.salaryTransactions || [],
          initialCash: parsed.initialCash || 0,
          draftExpiryMinutes: parsed.draftExpiryMinutes || 120,
          lastBackupTimestamp: parsed.lastBackupTimestamp
        };
      } catch (e) {
        console.error("Failed to parse storage data", e);
      }
    }
    // Default initial data structure
    return {
      products: [],
      sales: [],
      expenses: [],
      returns: [],
      drafts: [],
      logs: [],
      partners: [],
      wholesaleTransactions: [],
      drivers: [],
      customers: [],
      // Fix: Ensure HR properties are initialized for fresh installations
      employees: [],
      attendance: [],
      salaryTransactions: [],
      initialCash: 0,
      draftExpiryMinutes: 120,
    };
  },

  saveData: (data: AppData): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  exportData: (data: AppData) => {
    const backupTime = Date.now();
    const dataWithTimestamp = { ...data, lastBackupTimestamp: backupTime };
    storageService.saveData(dataWithTimestamp);

    const blob = new Blob([JSON.stringify(dataWithTimestamp, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.href = url;
    link.download = `twinx_ledger_${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    return backupTime;
  },

  importData: async (file: File): Promise<AppData | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          if (Array.isArray(data.products) && Array.isArray(data.sales)) {
            if (!data.logs) data.logs = [];
            if (!data.partners) data.partners = [];
            if (!data.wholesaleTransactions) data.wholesaleTransactions = [];
            if (!data.drivers) data.drivers = [];
            if (!data.customers) data.customers = [];
            if (!data.employees) data.employees = [];
            if (!data.attendance) data.attendance = [];
            if (!data.salaryTransactions) data.salaryTransactions = [];
            resolve(data);
          } else {
            console.error("Invalid ledger format: Missing required fields.");
            resolve(null);
          }
        } catch (err) {
          console.error("Import error: Corrupted JSON file", err);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
  }
};
