
import { AppData, Sale, WholesaleTransaction, SaleReturn, Expense, LogEntry, Product, Customer, Employee, Attendance, SalaryTransaction, StockLog, Shift } from '../types';

/**
 * TwinX Operations Service
 * Pure state transformers ensuring "Atomic Transactions" and financial integrity.
 * This service is the single source of truth for state mutations.
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
  
  // --- SHIFT MANAGEMENT ---
  openShift: (currentData: AppData, startCash: number, openerName: string): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const activeShift = newData.shifts.find(s => s.status === 'open');
    if (activeShift) throw new Error("A shift is already open. Please close it first.");

    const newShift: Shift = {
      id: crypto.randomUUID(),
      openedBy: openerName,
      startTime: Date.now(),
      startCash,
      status: 'open'
    };
    newData.shifts.push(newShift);
    newData.logs = [createLog('SHIFT_OPEN', 'system', `Shift opened by ${openerName} with ${startCash}`), ...newData.logs];
    return newData;
  },

  closeShift: (currentData: AppData, endCash: number, notes?: string): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const shiftIndex = newData.shifts.findIndex(s => s.status === 'open');
    if (shiftIndex === -1) throw new Error("No active shift to close.");

    const shift = newData.shifts[shiftIndex];
    
    newData.shifts[shiftIndex] = {
      ...shift,
      endTime: Date.now(),
      endCash,
      status: 'closed',
      notes
    };
    newData.logs = [createLog('SHIFT_CLOSE', 'system', `Shift closed. Counted: ${endCash}`), ...newData.logs];
    return newData;
  },

  /**
   * Processes a retail sale atomically.
   * FIX: Customer Total Purchases now EXCLUDES delivery fee.
   */
  processRetailSale: (currentData: AppData, saleData: Partial<Sale>): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    
    // CRITICAL: Enforce Active Shift
    const activeShift = newData.shifts.find(s => s.status === 'open');
    if (!activeShift) throw new Error("SHIFT_CLOSED: You must open a shift before selling.");

    const items = saleData.items || [];
    const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const discount = saleData.totalDiscount || 0;
    const deliveryIncome = saleData.deliveryFee || 0;

    // 1. Validate and Deduct Stock
    let totalCost = 0;
    for (const item of items) {
      const pIndex = newData.products.findIndex(prod => prod.id === item.id);
      if (pIndex === -1) throw new Error(`Product missing from ledger: ${item.name}`);
      const p = newData.products[pIndex];
      
      if (p.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.name}. Available: ${p.stock}`);
      }
      
      totalCost += (p.costPrice * item.quantity);
      newData.products[pIndex].stock -= item.quantity;
    }

    // Financials
    const productRevenue = subtotal - discount; // Net revenue from goods only
    const total = productRevenue + deliveryIncome; // Total Invoice Value
    const paid = saleData.paidAmount ?? total;
    const remaining = Math.max(0, total - paid);
    const totalProfit = (productRevenue - totalCost) + deliveryIncome;
    
    const pointsEarned = Math.max(0, Math.floor(productRevenue));

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
      status: saleData.status || (saleData.isDelivery ? 'pending' : 'completed'),
      shiftId: activeShift.id
    };

    // 2. Update Customer Stats (FIXED: Exclude Delivery Fee)
    if (finalSale.customerId) {
      const cIndex = newData.customers.findIndex(c => c.id === finalSale.customerId);
      if (cIndex >= 0) {
        const c = newData.customers[cIndex];
        newData.customers[cIndex] = {
          ...c,
          totalPurchases: c.totalPurchases + productRevenue, // Only add product value, not delivery
          invoiceCount: c.invoiceCount + 1,
          totalPoints: (c.totalPoints || 0) + pointsEarned,
          lastOrderTimestamp: finalSale.timestamp,
          lastVisit: Date.now()
        };
      }
    }

    // 3. Commit
    newData.sales = [finalSale, ...newData.sales];
    newData.logs = [
      createLog('SALE_COMPLETED', 'sale', `INV #${finalSale.id.split('-')[0]} for ${total}`),
      ...newData.logs
    ].slice(0, 5000);

    return newData;
  },

  /**
   * Update order/delivery status with full reversal logic.
   * FIX: Correctly reverse customer stats including delivery fee separation.
   */
  updateDeliveryStatus: (currentData: AppData, saleId: string, status: 'delivered' | 'cancelled' | 'pending'): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const saleIndex = newData.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) throw new Error("Sale record not found.");
    
    const originalSale = newData.sales[saleIndex];
    const oldStatus = originalSale.status;
    if (oldStatus === status) return currentData;

    // REVERSAL LOGIC: Transitioning TO Cancelled
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      // 1. Restock items
      originalSale.items.forEach(item => {
        const pIndex = newData.products.findIndex(p => p.id === item.id);
        if (pIndex >= 0) {
          const quantityToRestore = item.quantity - (item.returnedQuantity || 0);
          if (quantityToRestore > 0) {
             newData.products[pIndex].stock += quantityToRestore;
          }
        }
      });

      // 2. Reverse Financials from Customer Profile (FIXED)
      if (originalSale.customerId) {
        const cIndex = newData.customers.findIndex(c => c.id === originalSale.customerId);
        if (cIndex >= 0) {
          const c = newData.customers[cIndex];
          // Determine what was added to customer stats (Total - Delivery)
          const valueAddedToStats = originalSale.total - (originalSale.deliveryFee || 0);
          
          newData.customers[cIndex] = {
            ...c,
            totalPurchases: Math.max(0, c.totalPurchases - valueAddedToStats),
            invoiceCount: Math.max(0, c.invoiceCount - 1),
            totalPoints: Math.max(0, (c.totalPoints || 0) - (originalSale.pointsEarned || 0))
          };
        }
      }
      
      // 3. Mark as Cancelled
      newData.sales[saleIndex].status = 'cancelled';
      
    } 
    // RESTORATION LOGIC: Transitioning FROM Cancelled back to Active
    else if (status !== 'cancelled' && oldStatus === 'cancelled') {
      // 1. Deduct Stock again
      originalSale.items.forEach(item => {
        const pIndex = newData.products.findIndex(p => p.id === item.id);
        if (pIndex >= 0) {
          const reqQty = item.quantity - (item.returnedQuantity || 0);
          if (newData.products[pIndex].stock < reqQty) {
            throw new Error(`Cannot restore order: ${item.name} is out of stock.`);
          }
          newData.products[pIndex].stock -= reqQty;
        }
      });

      // 2. Restore Financials to Customer Profile (FIXED)
      if (originalSale.customerId) {
        const cIndex = newData.customers.findIndex(c => c.id === originalSale.customerId);
        if (cIndex >= 0) {
          const c = newData.customers[cIndex];
          const valueToRestore = originalSale.total - (originalSale.deliveryFee || 0);

          newData.customers[cIndex] = {
            ...c,
            totalPurchases: c.totalPurchases + valueToRestore,
            invoiceCount: c.invoiceCount + 1,
            totalPoints: (c.totalPoints || 0) + (originalSale.pointsEarned || 0)
          };
        }
      }
      newData.sales[saleIndex].status = status;
    } else {
      // Normal status update
      newData.sales[saleIndex].status = status;
    }

    newData.logs = [
      createLog('STATUS_UPDATE', 'delivery', `Order #${saleId.split('-')[0]} set to ${status.toUpperCase()}`),
      ...newData.logs
    ].slice(0, 5000);

    return newData;
  },

  /**
   * Processes a Return.
   * FIX: Ensure refunds are properly deducted.
   */
  processReturn: (currentData: AppData, returnRecord: SaleReturn): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const saleIndex = newData.sales.findIndex(s => s.id === returnRecord.saleId);
    if (saleIndex === -1) throw new Error("Original sale record not found.");
    
    const originalSale = newData.sales[saleIndex];
    if (originalSale.status === 'cancelled') throw new Error("Cannot process return for a cancelled order.");

    const discountRatio = originalSale.subtotal > 0 
      ? (originalSale.subtotal - originalSale.totalDiscount) / originalSale.subtotal 
      : 1;
    
    let totalCalculatedRefund = 0;
    
    for (const returnItem of returnRecord.items) {
      const itemIndex = originalSale.items.findIndex(i => i.id === returnItem.productId);
      if (itemIndex === -1) throw new Error(`Product ${returnItem.productId} not found in invoice.`);
      
      const item = originalSale.items[itemIndex];
      const currentReturned = item.returnedQuantity || 0;
      
      if (currentReturned + returnItem.quantity > item.quantity) {
        throw new Error(`Cannot return ${returnItem.quantity}. Only ${item.quantity - currentReturned} remaining.`);
      }

      // Update Sale Item
      originalSale.items[itemIndex].returnedQuantity = currentReturned + returnItem.quantity;
      
      // Calculate Refund
      totalCalculatedRefund += (item.price * returnItem.quantity) * discountRatio;
      
      // Return to Stock
      const pIndex = newData.products.findIndex(p => p.id === returnItem.productId);
      if (pIndex >= 0) {
        newData.products[pIndex].stock += returnItem.quantity;
      }
    }

    // Financial Adjustments
    originalSale.remainingAmount = Math.max(0, originalSale.remainingAmount - totalCalculatedRefund);

    // FIX: Loyalty Reversal & Customer Stats Adjustment
    if (originalSale.customerId) {
      const cIndex = newData.customers.findIndex(c => c.id === originalSale.customerId);
      if (cIndex >= 0) {
        const c = newData.customers[cIndex];
        newData.customers[cIndex] = {
           ...c,
           totalPurchases: Math.max(0, c.totalPurchases - totalCalculatedRefund), // Deduct refund from history
           totalPoints: Math.max(0, (c.totalPoints || 0) - Math.floor(totalCalculatedRefund))
        };
      }
    }

    newData.returns = [{ ...returnRecord, totalRefund: totalCalculatedRefund }, ...newData.returns];
    newData.logs = [
      createLog('RETURN_PROCESSED', 'return', `Refund of ${totalCalculatedRefund.toFixed(2)} for INV #${originalSale.id.split('-')[0]}`),
      ...newData.logs
    ].slice(0, 5000);

    return newData;
  },

  processWholesaleTransaction: (currentData: AppData, transaction: WholesaleTransaction): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const isPurchase = transaction.type === 'purchase';
    
    for (const item of transaction.items) {
      const pIndex = newData.products.findIndex(prod => prod.id === item.productId);
      if (pIndex === -1) throw new Error(`Product missing: ${item.name}`);
      const p = newData.products[pIndex];
      
      if (!isPurchase && p.stock < item.quantity) {
        throw new Error(`Insufficient stock: ${item.name}`);
      }
      
      newData.products[pIndex].stock += isPurchase ? item.quantity : -item.quantity;
    }

    newData.wholesaleTransactions = [transaction, ...newData.wholesaleTransactions];
    newData.logs = [
      createLog(isPurchase ? 'WHOLESALE_PURCHASE' : 'WHOLESALE_SALE', 'wholesale', `Bulk ${transaction.type} finalized.`),
      ...newData.logs
    ].slice(0, 5000);

    return newData;
  },

  addEmployee: (currentData: AppData, employee: Employee): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    newData.employees = [...(newData.employees || []), employee];
    newData.logs = [
      createLog('STAFF_ADDED', 'hr', `Registered ${employee.role}: ${employee.name}`),
      ...newData.logs
    ].slice(0, 5000);
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
        if (todayRecord) throw new Error("Already checked in today.");
        newData.attendance.push({ id: crypto.randomUUID(), employeeId, date: today, timestamp: now, checkIn: now, breaks: [], status: 'present' });
        break;
      case 'check_out':
        if (!todayRecord || todayRecord.status === 'completed') throw new Error("No active session.");
        todayRecord.checkOut = now;
        todayRecord.status = 'completed';
        break;
      case 'break_start':
        if (!todayRecord || todayRecord.status !== 'present') throw new Error("Cannot start break.");
        todayRecord.status = 'on_break';
        todayRecord.breaks.push({ start: now });
        break;
      case 'break_end':
        if (!todayRecord || todayRecord.status !== 'on_break') throw new Error("Not on break.");
        todayRecord.status = 'present';
        todayRecord.breaks[todayRecord.breaks.length - 1].end = now;
        break;
    }

    newData.logs = [
      createLog('ATTENDANCE', 'hr', `Staff ${employeeId} performed ${action}`),
      ...newData.logs
    ].slice(0, 5000);
    return newData;
  },

  processSalaryTransaction: (currentData: AppData, transaction: SalaryTransaction): AppData => {
    const newData: AppData = JSON.parse(JSON.stringify(currentData));
    const employee = newData.employees.find(e => e.id === transaction.employeeId);
    if (!employee) throw new Error("Employee not found.");

    newData.salaryTransactions = [...(newData.salaryTransactions || []), transaction];
    
    newData.logs = [
      createLog('PAYROLL', 'hr', `Paid ${transaction.type} to ${employee.name}`),
      ...newData.logs
    ].slice(0, 5000);
    
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
    if (index === -1) throw new Error("Product missing from ledger");

    const product = newData.products[index];
    const oldStock = product.stock;
    const diff = oldStock - newQuantity;
    newData.products[index].stock = newQuantity;

    const stockLog: StockLog = { id: crypto.randomUUID(), productId, oldStock, newStock: newQuantity, reason, timestamp: Date.now(), employeeId };
    
    if (diff > 0) {
      newData.expenses.push({ 
        id: crypto.randomUUID(), 
        description: `Shrinkage: ${product.name} (${reason})`, 
        amount: diff * product.costPrice, 
        timestamp: Date.now() 
      });
    }

    newData.stockLogs = [stockLog, ...newData.stockLogs];
    newData.logs = [
      createLog('STOCK_ADJUSTED', 'inventory', `${product.name}: ${oldStock} -> ${newQuantity}`),
      ...newData.logs
    ].slice(0, 5000);
    
    return newData;
  }
};
