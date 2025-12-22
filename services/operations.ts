import { AppData, Sale, WholesaleTransaction, SaleReturn, Expense, LogEntry, Product, Customer, CartItem } from '../types';

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
   * Processes a return with strict quantity validation and debt-first refunding.
   */
  processReturn: (currentData: AppData, returnRecord: SaleReturn): AppData => {
    const originalSale = currentData.sales.find(s => s.id === returnRecord.saleId);
    if (!originalSale) throw new Error("Original sale not found.");

    // 1. Validate Quantities against original items
    const updatedSaleItems = originalSale.items.map(item => {
      const returning = returnRecord.items.find(ri => ri.productId === item.id);
      if (returning) {
        const currentReturned = item.returnedQuantity || 0;
        if (currentReturned + returning.quantity > item.quantity) {
          throw new Error(`Quantity exceeds original sale for: ${item.name}`);
        }
        return { ...item, returnedQuantity: currentReturned + returning.quantity };
      }
      return item;
    });

    // 2. Adjust Debt vs Cash Refund
    let refundRemaining = returnRecord.totalRefund;
    let updatedRemainingAmount = originalSale.remainingAmount;

    if (updatedRemainingAmount > 0) {
      const debtDeduction = Math.min(updatedRemainingAmount, refundRemaining);
      updatedRemainingAmount -= debtDeduction;
      refundRemaining -= debtDeduction;
    }

    // 3. Update Global Products (Restock)
    const updatedProducts = currentData.products.map(p => {
      const returned = returnRecord.items.find(ri => ri.productId === p.id);
      return returned ? { ...p, stock: p.stock + returned.quantity } : p;
    });

    // 4. Update Sales List with modified item returnedQuantities and remainingAmount
    const updatedSales = currentData.sales.map(s => 
      s.id === returnRecord.saleId 
        ? { ...s, items: updatedSaleItems, remainingAmount: updatedRemainingAmount } 
        : s
    );

    const log = createLog(
      'RETURN_PROCESSED', 
      'return', 
      `Processed return for INV #${originalSale.id.split('-')[0]}. Refunded Cash: ${refundRemaining}. Debt Reduced: ${originalSale.remainingAmount - updatedRemainingAmount}.`
    );

    return {
      ...currentData,
      products: updatedProducts,
      sales: updatedSales,
      returns: [returnRecord, ...currentData.returns],
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
  }
};