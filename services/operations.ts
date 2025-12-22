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
   * FIX: Ensured Customer Points (1:1 ratio) are persisted via index mapping.
   */
  processRetailSale: (currentData: AppData, saleData: Partial<Sale>): AppData => {
    const newData = { ...currentData };
    const items = saleData.items || [];
    const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const discount = saleData.totalDiscount || 0;
    const deliveryIncome = saleData.deliveryFee || 0;

    // Financial Pro: Product Cost Calculation & Stock Validation
    let totalCost = 0;
    const updatedProducts = [...newData.products];
    for (const item of items) {
      const pIndex = updatedProducts.findIndex(prod => prod.id === item.id);
      if (pIndex === -1) throw new Error(`Product not found: ${item.name}`);
      const p = updatedProducts[pIndex];
      
      if (p.stock < item.quantity) {
        throw new Error(`Insufficient stock: ${item.name}. Available: ${p.stock}`);
      }
      
      totalCost += (p.costPrice * item.quantity);
      // Update stock level in the cloned product array
      updatedProducts[pIndex] = { ...p, stock: p.stock - item.quantity };
    }

    const productRevenue = subtotal - discount;
    const total = productRevenue + deliveryIncome;
    const paid = saleData.paidAmount ?? total;
    const remaining = Math.max(0, total - paid);
    const totalProfit = (productRevenue - totalCost) + deliveryIncome;
    
    // Loyalty Point Logic: 1 Point per 1 Currency Unit
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

    // Loyalty Fix: Persist updated customer points correctly
    const updatedCustomers = [...newData.customers];
    if (finalSale.customerId) {
      const cIndex = updatedCustomers.findIndex(c => c.id === finalSale.customerId);
      if (cIndex >= 0) {
        const c = updatedCustomers[cIndex];
        updatedCustomers[cIndex] = {
          ...c,
          totalPurchases: c.totalPurchases + total,
          invoiceCount: c.invoiceCount + 1,
          lastOrderTimestamp: finalSale.timestamp,
          totalPoints: (c.totalPoints || 0) + pointsEarned,
          lastVisit: Date.now()
        };
      }
    }

    const log = createLog('SALE_COMPLETED', 'sale', `INV #${finalSale.id.split('-')[0]} total ${total}. Points: +${pointsEarned}`);

    return {
      ...newData,
      products: updatedProducts,
      sales: [finalSale, ...newData.sales],
      customers: updatedCustomers,
      logs: [log, ...newData.logs].slice(0, 5000)
    };
  },

  /**
   * Update order/delivery status.
   * FIX: Handles restocking logic automatically on cancellation.
   */
  updateDeliveryStatus: (currentData: AppData, saleId: string, status: 'delivered' | 'cancelled' | 'pending'): AppData => {
    const saleIndex = currentData.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) throw new Error("Sale record not found.");
    
    const originalSale = { ...currentData.sales[saleIndex] };
    if (originalSale.status === status) return currentData;

    let updatedProducts = [...currentData.products];
    let updatedCustomers = [...currentData.customers];

    // Restocking Logic for Cancellations
    if (status === 'cancelled' && originalSale.status !== 'cancelled') {
      originalSale.items.forEach(soldItem => {
        const pIndex = updatedProducts.findIndex(p => p.id === soldItem.id);
        if (pIndex >= 0) {
          const p = updatedProducts[pIndex];
          updatedProducts[pIndex] = { ...p, stock: p.stock + (soldItem.quantity - (soldItem.returnedQuantity || 0)) };
        }
      });

      if (originalSale.customerId) {
        const cIndex = updatedCustomers.findIndex(c => c.id === originalSale.customerId);
        if (cIndex >= 0) {
          const c = updatedCustomers[cIndex];
          updatedCustomers[cIndex] = {
            ...c,
            totalPurchases: Math.max(0, c.totalPurchases - originalSale.total),
            invoiceCount: Math.max(0, c.invoiceCount - 1),
            totalPoints: Math.max(0, (c.totalPoints || 0) - (originalSale.pointsEarned || 0))
          };
        }
      }
    } 
    // Handle Re-activation of cancelled order
    else if (status !== 'cancelled' && originalSale.status === 'cancelled') {
      originalSale.items.forEach(soldItem => {
        const pIndex = updatedProducts.findIndex(p => p.id === soldItem.id);
        if (pIndex >= 0) {
          const p = updatedProducts[pIndex];
          if (p.stock < soldItem.quantity) throw new Error(`Insufficient stock to restore order: ${p.name}`);
          updatedProducts[pIndex] = { ...p, stock: p.stock - soldItem.quantity };
        }
      });

      if (originalSale.customerId) {
        const cIndex = updatedCustomers.findIndex(c => c.id === originalSale.customerId);
        if (cIndex >= 0) {
          const c = updatedCustomers[cIndex];
          updatedCustomers[cIndex] = {
            ...c,
            totalPurchases: c.totalPurchases + originalSale.total,
            invoiceCount: c.invoiceCount + 1,
            totalPoints: (c.totalPoints || 0) + (originalSale.pointsEarned || 0)
          };
        }
      }
    }

    const updatedSales = [...currentData.sales];
    updatedSales[saleIndex] = { ...originalSale, status };

    const log = createLog('STATUS_UPDATE', 'delivery', `Order #${saleId.split('-')[0]} marked as ${status.toUpperCase()}`);

    return {
      ...currentData,
      products: updatedProducts,
      sales: updatedSales,
      customers: updatedCustomers,
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  /**
   * Re-orders a previous sale.
   * FIX: Generates new ID and triggers atomic processRetailSale.
   */
  duplicateSale: (data: AppData, originalSaleId: string): AppData => {
    const original = data.sales.find(s => s.id === originalSaleId);
    if (!original) throw new Error("Original sale record not found.");

    const newSaleData: Partial<Sale> = {
      id: crypto.randomUUID(), // Explicit new ID
      timestamp: Date.now(),
      items: original.items.map(i => ({ ...i, returnedQuantity: 0 })), // Clear return metadata
      subtotal: original.subtotal,
      totalDiscount: original.totalDiscount,
      total: original.total,
      paidAmount: 0, 
      remainingAmount: original.total,
      saleChannel: original.saleChannel,
      customerId: original.customerId,
      isDelivery: original.isDelivery,
      deliveryDetails: original.deliveryDetails,
      deliveryFee: original.deliveryFee,
      status: original.isDelivery ? 'pending' : 'completed'
    };

    // processRetailSale will handle stock deduction and new loyalty points
    return TwinXOps.processRetailSale(data, newSaleData);
  },

  /**
   * Robust Return Processor.
   * Adjusts stock and profit based on returned items only.
   */
  processReturn: (currentData: AppData, returnRecord: SaleReturn): AppData => {
    const saleIndex = currentData.sales.findIndex(s => s.id === returnRecord.saleId);
    if (saleIndex === -1) throw new Error("Original sale record not found.");
    const originalSale = { ...currentData.sales[saleIndex] };

    const productDiscountRatio = originalSale.subtotal > 0 
      ? (originalSale.subtotal - originalSale.totalDiscount) / originalSale.subtotal 
      : 1;
    
    let totalCalculatedRefund = 0;
    let totalReturnedCost = 0;
    const updatedSaleItems = [...originalSale.items];

    for (const returnItem of returnRecord.items) {
      const itemIndex = updatedSaleItems.findIndex(i => i.id === returnItem.productId);
      if (itemIndex === -1) throw new Error(`Product ${returnItem.productId} not found in original sale.`);
      
      const item = updatedSaleItems[itemIndex];
      const currentReturned = item.returnedQuantity || 0;
      
      if (currentReturned + returnItem.quantity > item.quantity) {
        throw new Error(`Cannot return more than sold. ${item.name}: ${currentReturned + returnItem.quantity} > ${item.quantity}`);
      }

      updatedSaleItems[itemIndex] = { ...item, returnedQuantity: currentReturned + returnItem.quantity };
      totalCalculatedRefund += (item.price * returnItem.quantity) * productDiscountRatio;
      
      const product = currentData.products.find(p => p.id === returnItem.productId);
      if (product) totalReturnedCost += (product.costPrice * returnItem.quantity);
    }

    const profitReduction = totalCalculatedRefund - totalReturnedCost;
    let newRemainingAmount = originalSale.remainingAmount;

    if (newRemainingAmount > 0) {
      newRemainingAmount = Math.max(0, newRemainingAmount - totalCalculatedRefund);
    }

    const updatedProducts = currentData.products.map(p => {
      const returning = returnRecord.items.find(ri => ri.productId === p.id);
      return returning ? { ...p, stock: p.stock + returning.quantity } : p;
    });

    const pointsToDeduct = Math.floor(totalCalculatedRefund);
    const updatedCustomers = currentData.customers.map(c => {
      if (c.id === originalSale.customerId) {
        return { ...c, totalPoints: Math.max(0, (c.totalPoints || 0) - pointsToDeduct) };
      }
      return c;
    });

    const updatedSales = [...currentData.sales];
    updatedSales[saleIndex] = {
      ...originalSale,
      items: updatedSaleItems,
      remainingAmount: newRemainingAmount,
      totalCost: originalSale.totalCost - totalReturnedCost,
      totalProfit: originalSale.totalProfit - profitReduction
    };

    const log = createLog('RETURN_PROCESSED', 'return', `Return for INV #${originalSale.id.split('-')[0]}. Refund: ${totalCalculatedRefund.toFixed(2)}`);

    return {
      ...currentData,
      products: updatedProducts,
      sales: updatedSales,
      customers: updatedCustomers,
      returns: [{ ...returnRecord, totalRefund: totalCalculatedRefund }, ...currentData.returns],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  processWholesaleTransaction: (currentData: AppData, transaction: WholesaleTransaction): AppData => {
    const isPurchase = transaction.type === 'purchase';
    
    if (!isPurchase) {
      transaction.items.forEach(item => {
        const p = currentData.products.find(prod => prod.id === item.productId);
        if (!p || p.stock < item.quantity) throw new Error(`Insufficient stock for wholesale: ${item.name}`);
      });
    }

    const updatedProducts = currentData.products.map(p => {
      const item = transaction.items.find(i => i.productId === p.id);
      return item ? { ...p, stock: isPurchase ? p.stock + item.quantity : p.stock - item.quantity } : p;
    });

    const log = createLog(isPurchase ? 'WHOLESALE_PURCHASE' : 'WHOLESALE_SALE', 'wholesale', `Bulk ${transaction.type} TX #${transaction.id.split('-')[0]}`);

    return {
      ...currentData,
      products: updatedProducts,
      wholesaleTransactions: [transaction, ...currentData.wholesaleTransactions],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  processExpense: (currentData: AppData, expense: Expense): AppData => {
    const log = createLog('EXPENSE_LOGGED', 'expense', `Recorded: ${expense.description} (${expense.amount})`);
    return {
      ...currentData,
      expenses: [expense, ...currentData.expenses],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  addEmployee: (currentData: AppData, employee: Employee): AppData => {
    const log = createLog('STAFF_ADDED', 'hr', `Registered ${employee.role}: ${employee.name}`);
    return {
      ...currentData,
      employees: [...(currentData.employees || []), employee],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  recordAttendanceAction: (currentData: AppData, employeeId: string, action: 'check_in' | 'check_out' | 'break_start' | 'break_end'): AppData => {
    const today = getTodayString();
    const now = Date.now();
    const attendanceRecords = [...(currentData.attendance || [])];
    const index = attendanceRecords.findIndex(r => r.employeeId === employeeId && r.date === today);
    const todayRecord = index > -1 ? { ...attendanceRecords[index] } : null;

    switch (action) {
      case 'check_in':
        if (todayRecord) throw new Error("Already checked in.");
        attendanceRecords.push({ id: crypto.randomUUID(), employeeId, date: today, timestamp: now, checkIn: now, breaks: [], status: 'present' });
        break;
      case 'check_out':
        if (!todayRecord || todayRecord.status === 'completed') throw new Error("No active session.");
        todayRecord.checkOut = now;
        todayRecord.status = 'completed';
        attendanceRecords[index] = todayRecord;
        break;
      case 'break_start':
        if (!todayRecord || todayRecord.status !== 'present') throw new Error("Cannot start break now.");
        todayRecord.status = 'on_break';
        todayRecord.breaks.push({ start: now });
        attendanceRecords[index] = todayRecord;
        break;
      case 'break_end':
        if (!todayRecord || todayRecord.status !== 'on_break') throw new Error("Not on break.");
        todayRecord.status = 'present';
        todayRecord.breaks[todayRecord.breaks.length - 1].end = now;
        attendanceRecords[index] = todayRecord;
        break;
    }

    return { ...currentData, attendance: attendanceRecords, logs: [createLog('ATTENDANCE', 'hr', `Staff ${employeeId} performed ${action}`), ...currentData.logs] };
  },

  processSalaryTransaction: (currentData: AppData, transaction: SalaryTransaction): AppData => {
    const employee = currentData.employees.find(e => e.id === transaction.employeeId);
    if (!employee) throw new Error("Employee not found.");

    const salaryExpense: Expense = {
      id: crypto.randomUUID(),
      description: `Payroll: ${employee.name} (${transaction.type})`,
      amount: transaction.amount,
      timestamp: transaction.timestamp,
      employeeId: employee.id
    };

    return {
      ...currentData,
      salaryTransactions: [...(currentData.salaryTransactions || []), transaction],
      expenses: [...(currentData.expenses || []), salaryExpense],
      logs: [createLog('PAYROLL', 'hr', `Paid ${transaction.type} to ${employee.name}`), ...currentData.logs]
    };
  },

  addCategory: (currentData: AppData, categoryName: string): AppData => {
    const categories = (currentData.categories || []);
    if (categories.includes(categoryName)) return currentData;
    return { ...currentData, categories: [...categories, categoryName], logs: [createLog('CATEGORY_ADDED', 'inventory', `New category: ${categoryName}`), ...currentData.logs] };
  },

  deleteCategory: (currentData: AppData, categoryName: string): AppData => {
    return { ...currentData, categories: (currentData.categories || []).filter(c => c !== categoryName), logs: [createLog('CATEGORY_REMOVED', 'inventory', `Category deleted: ${categoryName}`), ...currentData.logs] };
  },

  adjustStock: (currentData: AppData, productId: string, newQuantity: number, reason: string, employeeId: string): AppData => {
    const products = [...currentData.products];
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) throw new Error("Product not found");

    const product = products[index];
    const oldStock = product.stock;
    const diff = oldStock - newQuantity;
    products[index] = { ...product, stock: newQuantity };

    const stockLog: StockLog = { id: crypto.randomUUID(), productId, oldStock, newStock: newQuantity, reason, timestamp: Date.now(), employeeId };
    let updatedExpenses = [...(currentData.expenses || [])];
    
    if (diff > 0) {
      updatedExpenses.push({ id: crypto.randomUUID(), description: `Inv Loss: ${product.name} (${reason})`, amount: diff * product.costPrice, timestamp: Date.now() });
    }

    return {
      ...currentData,
      products,
      stockLogs: [stockLog, ...(currentData.stockLogs || [])],
      expenses: updatedExpenses,
      logs: [createLog('STOCK_ADJUSTED', 'inventory', `${product.name} ${oldStock} -> ${newQuantity}`), ...currentData.logs]
    };
  }
};