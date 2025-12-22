import { AppData, Sale, WholesaleTransaction, SaleReturn, Expense, LogEntry, Product, Customer, Employee, Attendance, SalaryTransaction, StockLog } from '../types';

/**
 * TwinX Operations Service
 * Pure state transformers ensuring "Atomic Transactions" and financial integrity.
 */

const createLog = (action: string, category: LogEntry['category'], details: string): LogEntry => ({
  id: crypto.randomUUID(),
  timestamp: Date.now(),
  action,
  category,
  details,
});

const getTodayString = () => new Date().toISOString().split('T')[0];

export const TwinXOps = {
  /**
   * Financial Truth Helpers
   */
  getTotals: (data: AppData) => {
    const receivables = data.sales.reduce((acc, s) => acc + (s.status !== 'cancelled' ? (s.remainingAmount || 0) : 0), 0) +
      data.wholesaleTransactions
        .filter(t => t.type === 'sale')
        .reduce((acc, t) => acc + (t.total - t.paidAmount), 0);

    const payables = data.wholesaleTransactions
      .filter(t => t.type === 'purchase')
      .reduce((acc, t) => acc + (t.total - t.paidAmount), 0);

    return { receivables, payables };
  },

  /**
   * Processes a retail sale atomically.
   * FIX: Ensured Customer Points (1:1 ratio) are persisted via index mapping and updated correctly.
   */
  processRetailSale: (currentData: AppData, saleData: Partial<Sale>): AppData => {
    // Create a working clone of current state
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    
    const items = saleData.items || [];
    const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const discount = saleData.totalDiscount || 0;
    const deliveryIncome = saleData.deliveryFee || 0;

    // Financial Pro: Product Cost Calculation & Stock Validation
    let totalCost = 0;
    for (const item of items) {
      const pIndex = newData.products.findIndex(prod => prod.id === item.id);
      if (pIndex === -1) throw new Error(`Product not found: ${item.name}`);
      const p = newData.products[pIndex];
      
      if (p.stock < item.quantity) {
        throw new Error(`Insufficient stock: ${item.name}. Available: ${p.stock}`);
      }
      
      totalCost += (p.costPrice * item.quantity);
      // Deduct stock
      newData.products[pIndex].stock -= item.quantity;
    }

    const productRevenue = subtotal - discount;
    const total = productRevenue + deliveryIncome;
    const paid = saleData.paidAmount ?? total;
    const remaining = Math.max(0, total - paid);
    const totalProfit = (productRevenue - totalCost) + deliveryIncome;
    
    // Loyalty Point Logic: 1 Point per 1 Currency Unit (1:1)
    const pointsEarned = Math.floor(total);

    const finalSale: Sale = {
      id: saleData.id || crypto.randomUUID(),
      timestamp: saleData.timestamp || Date.now(),
      items: items.map(i => ({ ...i, returnedQuantity: 0 })),
      subtotal,
      totalDiscount: discount,
      total,
      paidAmount: paid,
      remainingAmount: remaining,
      saleChannel: saleData.saleChannel || 'store',
      customerId: saleData.customerId,
      isDelivery: saleData.isDelivery,
      deliveryDetails: saleData.deliveryDetails,
      deliveryFee: deliveryIncome,
      driverId: saleData.driverId,
      totalCost,
      totalProfit,
      pointsEarned,
      status: saleData.status || (saleData.isDelivery ? 'pending' : 'completed')
    };

    // Loyalty Persistence FIX: Explicit index-based mapping
    if (finalSale.customerId) {
      const customerIndex = newData.customers.findIndex(c => c.id === finalSale.customerId);
      if (customerIndex >= 0) {
        newData.customers[customerIndex] = {
          ...newData.customers[customerIndex],
          totalPurchases: newData.customers[customerIndex].totalPurchases + total,
          invoiceCount: newData.customers[customerIndex].invoiceCount + 1,
          lastOrderTimestamp: finalSale.timestamp,
          totalPoints: (newData.customers[customerIndex].totalPoints || 0) + pointsEarned,
          lastVisit: Date.now()
        };
      }
    }

    const log = createLog('SALE_COMPLETED', 'sale', `INV #${finalSale.id.split('-')[0]} for ${total}. Points earned: ${pointsEarned}.`);

    newData.sales = [finalSale, ...newData.sales];
    newData.logs = [log, ...newData.logs].slice(0, 5000);

    return newData;
  },

  /**
   * Update order/delivery status.
   * FIX: Handles 'cancelled' status by restocking items to inventory (Atomic Restock).
   */
  updateDeliveryStatus: (currentData: AppData, saleId: string, status: 'delivered' | 'cancelled' | 'pending'): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const saleIndex = newData.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) throw new Error("Sale record not found.");
    
    const originalSale = newData.sales[saleIndex];
    if (originalSale.status === status) return currentData;

    // Logic for 'cancelled': Restock Items & Reverse Customer Stats
    if (status === 'cancelled' && originalSale.status !== 'cancelled') {
      // 1. Restore Stock
      originalSale.items.forEach(soldItem => {
        const pIndex = newData.products.findIndex(p => p.id === soldItem.id);
        if (pIndex >= 0) {
          newData.products[pIndex].stock += (soldItem.quantity - (soldItem.returnedQuantity || 0));
        }
      });

      // 2. Reverse Customer Accumulations
      if (originalSale.customerId) {
        const cIndex = newData.customers.findIndex(c => c.id === originalSale.customerId);
        if (cIndex >= 0) {
          const c = newData.customers[cIndex];
          newData.customers[cIndex] = {
            ...c,
            totalPurchases: Math.max(0, c.totalPurchases - originalSale.total),
            invoiceCount: Math.max(0, c.invoiceCount - 1),
            totalPoints: Math.max(0, (c.totalPoints || 0) - (originalSale.pointsEarned || 0))
          };
        }
      }
    } 
    // Logic for 'pending/delivered' from 'cancelled': Re-deduct Stock (Validation Required)
    else if (status !== 'cancelled' && originalSale.status === 'cancelled') {
      originalSale.items.forEach(soldItem => {
        const pIndex = newData.products.findIndex(p => p.id === soldItem.id);
        if (pIndex >= 0) {
          const p = newData.products[pIndex];
          if (p.stock < soldItem.quantity) throw new Error(`Insufficient stock to restore order: ${p.name}`);
          newData.products[pIndex].stock -= soldItem.quantity;
        }
      });

      if (originalSale.customerId) {
        const cIndex = newData.customers.findIndex(c => c.id === originalSale.customerId);
        if (cIndex >= 0) {
          const c = newData.customers[cIndex];
          newData.customers[cIndex] = {
            ...c,
            totalPurchases: c.totalPurchases + originalSale.total,
            invoiceCount: c.invoiceCount + 1,
            totalPoints: (c.totalPoints || 0) + (originalSale.pointsEarned || 0)
          };
        }
      }
    }

    // Update the status
    newData.sales[saleIndex].status = status;

    const log = createLog('STATUS_UPDATE', 'delivery', `Order #${saleId.split('-')[0]} marked as ${status.toUpperCase()}.`);
    newData.logs = [log, ...newData.logs].slice(0, 5000);

    return newData;
  },

  /**
   * Re-orders a previous sale.
   * FIX: Generates new sale ID and triggers processRetailSale for full validation.
   */
  duplicateSale: (data: AppData, originalSaleId: string): AppData => {
    const original = data.sales.find(s => s.id === originalSaleId);
    if (!original) throw new Error("Original sale record not found.");

    // Create copy data for a fresh transaction
    const newSaleData: Partial<Sale> = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      items: original.items.map(i => {
          const { returnedQuantity, ...rest } = i; // Strip return metadata
          return { ...rest, returnedQuantity: 0 };
      }),
      subtotal: original.subtotal,
      totalDiscount: original.totalDiscount,
      discountType: original.discountType,
      discountValue: original.discountValue,
      total: original.total,
      paidAmount: 0, // Assume not paid initially for duplication
      remainingAmount: original.total,
      saleChannel: original.saleChannel,
      customerId: original.customerId,
      isDelivery: original.isDelivery,
      deliveryDetails: original.deliveryDetails,
      deliveryFee: original.deliveryFee,
      status: original.isDelivery ? 'pending' : 'completed'
    };

    // Use processRetailSale to handle atomic stock deduction and point persistence
    return TwinXOps.processRetailSale(data, newSaleData);
  },

  /**
   * Process a Return.
   * Adjusts stock and profit based on returned items.
   */
  processReturn: (currentData: AppData, returnRecord: SaleReturn): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const saleIndex = newData.sales.findIndex(s => s.id === returnRecord.saleId);
    if (saleIndex === -1) throw new Error("Original sale record not found.");
    
    const originalSale = newData.sales[saleIndex];
    const productDiscountRatio = originalSale.subtotal > 0 
      ? (originalSale.subtotal - originalSale.totalDiscount) / originalSale.subtotal 
      : 1;
    
    let totalCalculatedRefund = 0;
    let totalReturnedCost = 0;

    for (const returnItem of returnRecord.items) {
      const itemIndex = originalSale.items.findIndex(i => i.id === returnItem.productId);
      if (itemIndex === -1) throw new Error(`Product ${returnItem.productId} not found in invoice.`);
      
      const item = originalSale.items[itemIndex];
      const currentReturned = item.returnedQuantity || 0;
      
      if (currentReturned + returnItem.quantity > item.quantity) {
        throw new Error(`Cannot return more than sold. ${item.name}: ${currentReturned + returnItem.quantity} > ${item.quantity}`);
      }

      // 1. Update item return metadata
      originalSale.items[itemIndex].returnedQuantity = currentReturned + returnItem.quantity;
      
      // 2. Calculate refund values
      totalCalculatedRefund += (item.price * returnItem.quantity) * productDiscountRatio;
      
      // 3. Return to stock
      const pIndex = newData.products.findIndex(p => p.id === returnItem.productId);
      if (pIndex >= 0) {
        newData.products[pIndex].stock += returnItem.quantity;
        totalReturnedCost += (newData.products[pIndex].costPrice * returnItem.quantity);
      }
    }

    // Financial adjustment
    const profitReduction = totalCalculatedRefund - totalReturnedCost;
    originalSale.remainingAmount = Math.max(0, originalSale.remainingAmount - totalCalculatedRefund);
    originalSale.totalCost -= totalReturnedCost;
    originalSale.totalProfit -= profitReduction;

    // Loyalty reversal (Points deducted per refund value)
    const pointsToDeduct = Math.floor(totalCalculatedRefund);
    if (originalSale.customerId) {
      const cIndex = newData.customers.findIndex(c => c.id === originalSale.customerId);
      if (cIndex >= 0) {
        newData.customers[cIndex].totalPoints = Math.max(0, (newData.customers[cIndex].totalPoints || 0) - pointsToDeduct);
      }
    }

    const log = createLog('RETURN_PROCESSED', 'return', `Processed refund of ${totalCalculatedRefund.toFixed(2)} for INV #${originalSale.id.split('-')[0]}.`);
    
    newData.returns = [{ ...returnRecord, totalRefund: totalCalculatedRefund }, ...newData.returns];
    newData.logs = [log, ...newData.logs].slice(0, 5000);

    return newData;
  },

  processWholesaleTransaction: (currentData: AppData, transaction: WholesaleTransaction): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const isPurchase = transaction.type === 'purchase';
    
    for (const item of transaction.items) {
      const pIndex = newData.products.findIndex(prod => prod.id === item.productId);
      if (pIndex === -1) throw new Error(`Product not found: ${item.name}`);
      const p = newData.products[pIndex];
      
      if (!isPurchase && p.stock < item.quantity) {
        throw new Error(`Insufficient stock for wholesale: ${item.name}`);
      }
      
      newData.products[pIndex].stock += isPurchase ? item.quantity : -item.quantity;
    }

    const log = createLog(isPurchase ? 'WHOLESALE_PURCHASE' : 'WHOLESALE_SALE', 'wholesale', `Bulk ${transaction.type} to/from partner.`);
    newData.wholesaleTransactions = [transaction, ...newData.wholesaleTransactions];
    newData.logs = [log, ...newData.logs].slice(0, 5000);

    return newData;
  },

  processExpense: (currentData: AppData, expense: Expense): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const log = createLog('EXPENSE_LOGGED', 'expense', `Recorded: ${expense.description} (${expense.amount})`);
    newData.expenses = [expense, ...newData.expenses];
    newData.logs = [log, ...newData.logs].slice(0, 5000);
    return newData;
  },

  addEmployee: (currentData: AppData, employee: Employee): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    newData.employees = [...(newData.employees || []), employee];
    newData.logs = [createLog('STAFF_ADDED', 'hr', `Registered ${employee.role}: ${employee.name}`), ...newData.logs];
    return newData;
  },

  recordAttendanceAction: (currentData: AppData, employeeId: string, action: 'check_in' | 'check_out' | 'break_start' | 'break_end'): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const today = getTodayString();
    const now = Date.now();
    const index = newData.attendance.findIndex(r => r.employeeId === employeeId && r.date === today);
    const todayRecord = index > -1 ? newData.attendance[index] : null;

    switch (action) {
      case 'check_in':
        if (todayRecord) throw new Error("Already checked in.");
        newData.attendance.push({ id: crypto.randomUUID(), employeeId, date: today, timestamp: now, checkIn: now, breaks: [], status: 'present' });
        break;
      case 'check_out':
        if (!todayRecord || todayRecord.status === 'completed') throw new Error("No active session.");
        todayRecord.checkOut = now;
        todayRecord.status = 'completed';
        break;
      case 'break_start':
        if (!todayRecord || todayRecord.status !== 'present') throw new Error("Cannot start break now.");
        todayRecord.status = 'on_break';
        todayRecord.breaks.push({ start: now });
        break;
      case 'break_end':
        if (!todayRecord || todayRecord.status !== 'on_break') throw new Error("Not on break.");
        todayRecord.status = 'present';
        todayRecord.breaks[todayRecord.breaks.length - 1].end = now;
        break;
    }

    newData.logs = [createLog('ATTENDANCE', 'hr', `Staff ${employeeId} performed ${action}`), ...newData.logs];
    return newData;
  },

  processSalaryTransaction: (currentData: AppData, transaction: SalaryTransaction): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const employee = newData.employees.find(e => e.id === transaction.employeeId);
    if (!employee) throw new Error("Employee not found.");

    const salaryExpense: Expense = {
      id: crypto.randomUUID(),
      description: `Payroll: ${employee.name} (${transaction.type})`,
      amount: transaction.amount,
      timestamp: transaction.timestamp,
      employeeId: employee.id
    };

    newData.salaryTransactions = [...(newData.salaryTransactions || []), transaction];
    newData.expenses = [...(newData.expenses || []), salaryExpense];
    newData.logs = [createLog('PAYROLL', 'hr', `Paid ${transaction.type} to ${employee.name}`), ...newData.logs];
    
    return newData;
  },

  addCategory: (currentData: AppData, categoryName: string): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    if (newData.categories.includes(categoryName)) return currentData;
    newData.categories.push(categoryName);
    newData.logs = [createLog('CATEGORY_ADDED', 'inventory', `New category: ${categoryName}`), ...newData.logs];
    return newData;
  },

  deleteCategory: (currentData: AppData, categoryName: string): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    newData.categories = newData.categories.filter(c => c !== categoryName);
    newData.logs = [createLog('CATEGORY_REMOVED', 'inventory', `Category deleted: ${categoryName}`), ...newData.logs];
    return newData;
  },

  adjustStock: (currentData: AppData, productId: string, newQuantity: number, reason: string, employeeId: string): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const index = newData.products.findIndex(p => p.id === productId);
    if (index === -1) throw new Error("Product not found");

    const product = newData.products[index];
    const oldStock = product.stock;
    const diff = oldStock - newQuantity;
    newData.products[index].stock = newQuantity;

    const stockLog: StockLog = { id: crypto.randomUUID(), productId, oldStock, newStock: newQuantity, reason, timestamp: Date.now(), employeeId };
    
    if (diff > 0) {
      newData.expenses.push({ id: crypto.randomUUID(), description: `Inv Loss: ${product.name} (${reason})`, amount: diff * product.costPrice, timestamp: Date.now() });
    }

    newData.stockLogs = [stockLog, ...newData.stockLogs];
    newData.logs = [createLog('STOCK_ADJUSTED', 'inventory', `${product.name} ${oldStock} -> ${newQuantity}`), ...newData.logs];
    
    return newData;
  }
};