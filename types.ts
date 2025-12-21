
export interface Product {
  id: string;
  name: string;
  barcode?: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  imagePath?: string;
  isSystemGenerated?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
}

export interface DeliveryDetails {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleId?: string;
  isActive: boolean;
}

export interface Sale {
  id: string;
  timestamp: number;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  isDelivery?: boolean;
  deliveryDetails?: DeliveryDetails;
  deliveryFee?: number;
  driverId?: string; // معرف الطيار
}

export interface DraftInvoice {
  id: string;
  timestamp: number;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  isDelivery?: boolean;
  deliveryDetails?: DeliveryDetails;
  deliveryFee?: number;
}

export interface ReturnItem {
  productId: string;
  quantity: number;
  refundAmount: number;
}

export interface SaleReturn {
  id: string;
  saleId: string;
  timestamp: number;
  items: ReturnItem[];
  totalRefund: number;
  customerName?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  action: string;
  details: string;
  category: 'sale' | 'inventory' | 'expense' | 'return' | 'system' | 'cash' | 'wholesale' | 'delivery';
}

export interface WholesalePartner {
  id: string;
  name: string;
  contact: string;
  type: 'buyer' | 'supplier';
  createdAt: number;
}

export interface WholesaleTransaction {
  id: string;
  partnerId: string;
  type: 'purchase' | 'sale';
  items: {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  total: number;
  paidAmount: number;
  timestamp: number;
}

export interface AppData {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  returns: SaleReturn[];
  drafts: DraftInvoice[];
  logs: LogEntry[];
  partners: WholesalePartner[];
  wholesaleTransactions: WholesaleTransaction[];
  drivers: Driver[]; // سجل الطيارين
  initialCash: number;
  draftExpiryMinutes: number;
  lastBackupTimestamp?: number;
  currency?: string;
}

export type ViewType = 'dashboard' | 'sales' | 'inventory' | 'expenses' | 'intelligence' | 'settings' | 'returns' | 'reports' | 'logs' | 'wholesale' | 'delivery';
