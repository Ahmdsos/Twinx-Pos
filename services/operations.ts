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
    const receivables = data.sales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0) +
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
   * Separates Product Revenue vs Delivery Income.
   */
  processRetailSale: (currentData: AppData, saleData: Partial<Sale>): AppData => {
    const items = saleData.items || [];
    const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const discount = saleData.totalDiscount || 0;
    const deliveryIncome = saleData.deliveryFee || 0;

    // Financial Pro: Product Cost Calculation
    let totalCost = 0;
    for (const item of items) {
      const p = currentData.products.find(prod => prod.id === item.id);
      if (!p || p.stock < item.quantity) {
        throw new Error(`Insufficient stock: ${item.name}`);
      }
      totalCost += (p.costPrice * item.quantity);
    }

    // Total = (Products - Discount) + Delivery
    const productRevenue = subtotal - discount;
    const total = productRevenue + deliveryIncome;
    
    const paid = saleData.paidAmount ?? total;
    const remaining = Math.max(0, total - paid);

    // Profit Logic: (Product Revenue - Product Cost) + Delivery Fee (100% margin)
    const productProfit = productRevenue - totalCost;
    const totalProfit = productProfit + deliveryIncome;
    
    // Loyalty Logic: 1 Currency Unit = 1 Point
    const pointsEarned = Math.floor(total); 

    const updatedProducts = currentData.products.map(p => {
      const sold = items.find(i => i.id === p.id);
      return sold ? { ...p, stock: p.stock - sold.quantity } : p;
    });

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
      pointsEarned
    };

    const updatedCustomers = currentData.customers.map(c => {
      if (c.id === saleData.customerId) {
        return {
          ...c,
          totalPurchases: c.totalPurchases + total,
          invoiceCount: c.invoiceCount + 1,
          lastOrderTimestamp: finalSale.timestamp,
          channelsUsed: Array.from(new Set([...c.channelsUsed, finalSale.saleChannel])),
          totalPoints: (c.totalPoints || 0) + pointsEarned,
          lastVisit: finalSale.timestamp
        };
      }
      return c;
    });

    const log = createLog('SALE_COMPLETED', 'sale', `Retail Sale #${finalSale.id.split('-')[0]} for ${total}. Net Profit: ${totalProfit.toFixed(2)} (Products: ${productProfit.toFixed(2)}, Delivery: ${deliveryIncome.toFixed(2)}).`);

    return {
      ...currentData,
      products: updatedProducts,
      sales: [finalSale, ...currentData.sales],
      customers: updatedCustomers,
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  /**
   * Robust Return Processor.
   * Adjusts stock and profit based on returned items only.
   */
  processReturn: (currentData: AppData, returnRecord: SaleReturn): AppData => {
    const saleIndex = currentData.sales.findIndex(s => s.id === returnRecord.saleId);
    if (saleIndex === -1) throw new Error("Original sale record not found.");
    const originalSale = { ...currentData.sales[saleIndex] };

    // Item Discount Ratio for proportional refund calculation (Excludes delivery from ratio)
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
        throw new Error(`Cannot return ${returnItem.quantity} units. Already returned: ${currentReturned}/${item.quantity}`);
      }

      updatedSaleItems[itemIndex] = {
        ...item,
        returnedQuantity: currentReturned + returnItem.quantity
      };

      // Refund based on item price after proportional discount
      const itemRefundValue = (item.price * returnItem.quantity) * productDiscountRatio;
      totalCalculatedRefund += itemRefundValue;
      
      // Cost to be subtracted from original cost record
      const product = currentData.products.find(p => p.id === returnItem.productId);
      if (product) {
        totalReturnedCost += (product.costPrice * returnItem.quantity);
      }
    }

    // Profit lost = (Refund Amount for items) - (Cost of items)
    const profitReduction = totalCalculatedRefund - totalReturnedCost;

    let refundRemaining = totalCalculatedRefund;
    let newRemainingAmount = originalSale.remainingAmount;

    // Apply refund to existing debt first
    if (newRemainingAmount > 0) {
      const debtDeduction = Math.min(newRemainingAmount, refundRemaining);
      newRemainingAmount -= debtDeduction;
      refundRemaining -= debtDeduction;
    }

    const updatedProducts = currentData.products.map(p => {
      const returning = returnRecord.items.find(ri => ri.productId === p.id);
      return returning ? { ...p, stock: p.stock + returning.quantity } : p;
    });

    // Loyalty Deduction Logic: 1 Unit Refunded = 1 Point Deducted
    const pointsToDeduct = Math.floor(totalCalculatedRefund);
    const updatedCustomers = currentData.customers.map(c => {
      if (c.id === originalSale.customerId) {
        return {
          ...c,
          totalPoints: Math.max(0, (c.totalPoints || 0) - pointsToDeduct)
        };
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

    const log = createLog(
      'RETURN_PROCESSED', 
      'return', 
      `Return for INV #${originalSale.id.split('-')[0]}. Refund: ${totalCalculatedRefund.toFixed(2)}. Profit Adjustment: -${profitReduction.toFixed(2)}. Points Reversed: ${pointsToDeduct}.`
    );

    return {
      ...currentData,
      products: updatedProducts,
      sales: updatedSales,
      customers: updatedCustomers,
      returns: [
        { ...returnRecord, totalRefund: totalCalculatedRefund }, 
        ...currentData.returns
      ],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  processWholesaleTransaction: (currentData: AppData, transaction: WholesaleTransaction): AppData => {
    const isPurchase = transaction.type === 'purchase';
    
    if (!isPurchase) {
      for (const item of transaction.items) {
        const p = currentData.products.find(prod => prod.id === item.productId);
        if (!p || p.stock < item.quantity) throw new Error(`Insufficient stock for: ${item.name}`);
      }
    }

    const updatedProducts = currentData.products.map(p => {
      const item = transaction.items.find(i => i.productId === p.id);
      return item ? { ...p, stock: isPurchase ? p.stock + item.quantity : p.stock - item.quantity } : p;
    });

    const log = createLog(
      isPurchase ? 'WHOLESALE_PURCHASE' : 'WHOLESALE_SALE',
      'wholesale',
      `Wholesale ${transaction.type} TX #${transaction.id.split('-')[0]}.`
    );

    return {
      ...currentData,
      products: updatedProducts,
      wholesaleTransactions: [transaction, ...currentData.wholesaleTransactions],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  processExpense: (currentData: AppData, expense: Expense): AppData => {
    const log = createLog('EXPENSE_LOGGED', 'expense', `Recorded expense: ${expense.description} (${expense.amount})`);
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

  recordAttendanceAction: (
    currentData: AppData, 
    employeeId: string, 
    action: 'check_in' | 'check_out' | 'break_start' | 'break_end'
  ): AppData => {
    const today = getTodayString();
    const now = Date.now();
    
    const attendanceRecords = (currentData.attendance || []);
    const todayRecordIndex = attendanceRecords.findIndex(r => r.employeeId === employeeId && r.date === today);
    const todayRecord = todayRecordIndex > -1 ? attendanceRecords[todayRecordIndex] : null;

    let updatedRecords = [...attendanceRecords];

    switch (action) {
      case 'check_in':
        if (todayRecord) throw new Error("Already checked in for today.");
        const newRecord: Attendance = {
          id: crypto.randomUUID(),
          employeeId,
          date: today,
          timestamp: now,
          checkIn: now,
          breaks: [],
          status: 'present'
        };
        updatedRecords.push(newRecord);
        break;

      case 'check_out':
        if (!todayRecord) throw new Error("No check-in found for today.");
        if (todayRecord.status === 'completed') throw new Error("Already checked out.");
        if (todayRecord.status === 'on_break') throw new Error("End break before checking out.");
        
        updatedRecords[todayRecordIndex] = {
          ...todayRecord,
          checkOut: now,
          status: 'completed'
        };
        break;

      case 'break_start':
        if (!todayRecord || todayRecord.status === 'completed') throw new Error("No active session found.");
        if (todayRecord.status === 'on_break') throw new Error("Already on break.");

        updatedRecords[todayRecordIndex] = {
          ...todayRecord,
          status: 'on_break',
          breaks: [...todayRecord.breaks, { start: now }]
        };
        break;

      case 'break_end':
        if (!todayRecord || todayRecord.status !== 'on_break') throw new Error("Not currently on break.");

        const lastBreakIndex = todayRecord.breaks.length - 1;
        const updatedBreaks = [...todayRecord.breaks];
        updatedBreaks[lastBreakIndex] = { ...updatedBreaks[lastBreakIndex], end: now };

        updatedRecords[todayRecordIndex] = {
          ...todayRecord,
          status: 'present',
          breaks: updatedBreaks
        };
        break;

      default:
        throw new Error("Invalid attendance action.");
    }

    const employee = currentData.employees.find(e => e.id === employeeId);
    const log = createLog('ATTENDANCE_ACTION', 'hr', `${employee?.name || 'Staff'} performed ${action}`);

    return {
      ...currentData,
      attendance: updatedRecords,
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
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

    const log = createLog('PAYROLL', 'hr', `${transaction.type} paid to ${employee.name}: ${transaction.amount}`);

    return {
      ...currentData,
      salaryTransactions: [...(currentData.salaryTransactions || []), transaction],
      expenses: [...(currentData.expenses || []), salaryExpense],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  addCategory: (currentData: AppData, categoryName: string): AppData => {
    const categories = (currentData.categories || []);
    if (categories.includes(categoryName)) return currentData;
    
    const log = createLog('CATEGORY_ADDED', 'inventory', `New category: ${categoryName}`);
    return {
      ...currentData,
      categories: [...categories, categoryName],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  deleteCategory: (currentData: AppData, categoryName: string): AppData => {
    const log = createLog('CATEGORY_REMOVED', 'inventory', `Category deleted: ${categoryName}`);
    return {
      ...currentData,
      categories: (currentData.categories || []).filter(c => c !== categoryName),
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  adjustStock: (currentData: AppData, productId: string, newQuantity: number, reason: string, employeeId: string): AppData => {
    const products = [...currentData.products];
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) throw new Error("Product not found");

    const product = products[productIndex];
    const oldStock = product.stock;
    const diff = oldStock - newQuantity;

    products[productIndex] = { ...product, stock: newQuantity };

    const stockLog: StockLog = {
      id: crypto.randomUUID(),
      productId,
      oldStock,
      newStock: newQuantity,
      reason,
      timestamp: Date.now(),
      employeeId
    };

    let updatedExpenses = [...(currentData.expenses || [])];
    
    if (diff > 0) {
      const lossValue = diff * product.costPrice;
      const lossExpense: Expense = {
        id: crypto.randomUUID(),
        description: `Inventory Loss: ${product.name} (${reason})`,
        amount: lossValue,
        timestamp: Date.now(),
      };
      updatedExpenses = [lossExpense, ...updatedExpenses];
    }

    const log = createLog('STOCK_ADJUSTED', 'inventory', `Stock for ${product.name} adjusted from ${oldStock} to ${newQuantity}. Reason: ${reason}`);

    return {
      ...currentData,
      products,
      stockLogs: [stockLog, ...(currentData.stockLogs || [])],
      expenses: updatedExpenses,
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  addProduct: (currentData: AppData, product: Product): AppData => {
    const log = createLog('PRODUCT_ADDED', 'inventory', `Product added: ${product.name} (${product.barcode || 'No Barcode'})`);
    return {
      ...currentData,
      products: [...currentData.products, product],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  }
};