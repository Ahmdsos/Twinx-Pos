import { AppData, Sale, WholesaleTransaction, SaleReturn, Expense, LogEntry, Product, Customer, Employee, Attendance, SalaryTransaction } from '../types';

/**
 * TwinX Operations Service
 * Pure state transformers to ensure "Atomic Transactions" and business integrity.
 */

const createLog = (action: string, category: LogEntry['category'], details: string): LogEntry => ({
  id: crypto.randomUUID(),
  timestamp: Date.now(),
  action,
  category,
  details,
});

export const TwinXOps = {
  /**
   * Processes a retail sale atomically.
   * Calculates financial truth, deducts stock, and updates customer loyalty.
   */
  processRetailSale: (currentData: AppData, saleData: Partial<Sale>): AppData => {
    const items = saleData.items || [];
    const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const discount = saleData.totalDiscount || 0;
    const delivery = saleData.deliveryFee || 0;
    const total = (subtotal - discount) + delivery;
    
    const paid = saleData.paidAmount ?? total;
    const remaining = Math.max(0, total - paid);

    // 1. Validate Stock
    for (const item of items) {
      const p = currentData.products.find(prod => prod.id === item.id);
      if (!p || p.stock < item.quantity) {
        throw new Error(`Insufficient stock: ${item.name}`);
      }
    }

    // 2. Update Products
    const updatedProducts = currentData.products.map(p => {
      const sold = items.find(i => i.id === p.id);
      return sold ? { ...p, stock: p.stock - sold.quantity } : p;
    });

    // 3. Prepare Sale Object
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
      deliveryFee: saleData.deliveryFee,
      driverId: saleData.driverId
    };

    // 4. Update Customer Profile
    const updatedCustomers = currentData.customers.map(c => {
      if (c.id === saleData.customerId) {
        return {
          ...c,
          totalPurchases: c.totalPurchases + total,
          invoiceCount: c.invoiceCount + 1,
          lastOrderTimestamp: finalSale.timestamp,
          channelsUsed: Array.from(new Set([...c.channelsUsed, finalSale.saleChannel]))
        };
      }
      return c;
    });

    const log = createLog('SALE_COMPLETED', 'sale', `Retail Sale #${finalSale.id.split('-')[0]} for ${total}. Paid: ${paid}.`);

    return {
      ...currentData,
      products: updatedProducts,
      sales: [finalSale, ...currentData.sales],
      customers: updatedCustomers,
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  /**
   * Robust Return Processor (TwinX Integrity Protocol)
   * Handles proportional discounts, debt reduction, and atomic quantity tracking.
   */
  processReturn: (currentData: AppData, returnRecord: SaleReturn): AppData => {
    // 1. Find and Clone Original Sale for mutation
    const saleIndex = currentData.sales.findIndex(s => s.id === returnRecord.saleId);
    if (saleIndex === -1) throw new Error("Original sale record not found.");
    const originalSale = { ...currentData.sales[saleIndex] };

    // 2. Calculate Effective Price (The Golden Ratio)
    // Ensures we refund exactly what was paid proportionally after global discounts/delivery.
    const discountRatio = originalSale.subtotal > 0 ? (originalSale.total / originalSale.subtotal) : 1;
    
    let totalCalculatedRefund = 0;
    const updatedSaleItems = [...originalSale.items];

    // 3. Validate and Update Quantities
    for (const returnItem of returnRecord.items) {
      const itemIndex = updatedSaleItems.findIndex(i => i.id === returnItem.productId);
      if (itemIndex === -1) throw new Error(`Product ${returnItem.productId} not found in original sale.`);
      
      const item = updatedSaleItems[itemIndex];
      const currentReturned = item.returnedQuantity || 0;
      
      if (currentReturned + returnItem.quantity > item.quantity) {
        throw new Error(`Integrity Violation: Cannot return ${returnItem.quantity} units of ${item.name}. Already returned: ${currentReturned}/${item.quantity}`);
      }

      // Update the sale record's returned quantity (Atomic lock)
      updatedSaleItems[itemIndex] = {
        ...item,
        returnedQuantity: currentReturned + returnItem.quantity
      };

      // Calculate proportional refund for this specific item
      const itemRefundValue = (item.price * returnItem.quantity) * discountRatio;
      totalCalculatedRefund += itemRefundValue;
    }

    // 4. Financial Truth: Debt vs Cash Settlement
    let refundRemaining = totalCalculatedRefund;
    let newRemainingAmount = originalSale.remainingAmount;

    if (newRemainingAmount > 0) {
      const debtDeduction = Math.min(newRemainingAmount, refundRemaining);
      newRemainingAmount -= debtDeduction;
      refundRemaining -= debtDeduction;
    }

    // 5. Update Global State
    // Restock Products
    const updatedProducts = currentData.products.map(p => {
      const returning = returnRecord.items.find(ri => ri.productId === p.id);
      return returning ? { ...p, stock: p.stock + returning.quantity } : p;
    });

    // Update the Sale in the history
    const updatedSales = [...currentData.sales];
    updatedSales[saleIndex] = {
      ...originalSale,
      items: updatedSaleItems,
      remainingAmount: newRemainingAmount
    };

    const log = createLog(
      'RETURN_PROCESSED', 
      'return', 
      `Return for INV #${originalSale.id.split('-')[0]}. Total Val: ${totalCalculatedRefund.toFixed(2)}. Cash Paid: ${refundRemaining.toFixed(2)}. Debt Reduced: ${(originalSale.remainingAmount - newRemainingAmount).toFixed(2)}.`
    );

    return {
      ...currentData,
      products: updatedProducts,
      sales: updatedSales,
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
      `Wholesale ${transaction.type} TX #${transaction.id.split('-')[0]} for ${transaction.total}.`
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

  /**
   * HR Logic: Adds an employee to the system.
   */
  addEmployee: (currentData: AppData, employee: Employee): AppData => {
    const log = createLog('EMPLOYEE_ADDED', 'hr', `Registered employee: ${employee.name} (${employee.role})`);
    return {
      ...currentData,
      employees: [...(currentData.employees || []), employee],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  /**
   * HR Logic: Records attendance for an employee.
   */
  recordAttendance: (currentData: AppData, attendance: Attendance): AppData => {
    const employee = currentData.employees.find(e => e.id === attendance.employeeId);
    const log = createLog('ATTENDANCE_LOGGED', 'hr', `Attendance for ${employee?.name || 'Unknown'}: ${attendance.status}`);
    return {
      ...currentData,
      attendance: [...(currentData.attendance || []), attendance],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  },

  /**
   * HR Logic: Processes a salary/bonus/advance payment.
   * Linked to expenses to maintain "Financial Truth" in Net Cash.
   */
  processSalaryTransaction: (currentData: AppData, transaction: SalaryTransaction): AppData => {
    const employee = currentData.employees.find(e => e.id === transaction.employeeId);
    if (!employee) throw new Error("Employee not found for transaction.");

    // Create a corresponding expense to impact net cash
    const salaryExpense: Expense = {
      id: crypto.randomUUID(),
      description: `Payroll: ${employee.name} (${transaction.type})`,
      amount: transaction.amount,
      timestamp: transaction.timestamp,
      employeeId: employee.id
    };

    const log = createLog(
      'PAYROLL_PROCESSED',
      'hr',
      `${transaction.type.toUpperCase()} paid to ${employee.name}: ${transaction.amount}`
    );

    return {
      ...currentData,
      salaryTransactions: [...(currentData.salaryTransactions || []), transaction],
      expenses: [...(currentData.expenses || []), salaryExpense],
      logs: [log, ...currentData.logs].slice(0, 5000)
    };
  }
};