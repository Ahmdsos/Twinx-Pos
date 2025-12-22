export interface Product {
  id: string;
  name: string;
  category: string;
  barcode?: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  minStockLevel?: number; // Custom alert threshold
  supplier?: string;
  imagePath?: string;
  isSystemGenerated?: boolean;
  expiryDate?: string;     // Pro: Expiry tracking
  brand?: string;          // Pro: Brand filtering
  aisleLocation?: string;  // Pro: Warehouse mapping
}

export interface CartItem extends Product {
  quantity: number;
  returnedQuantity?: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
}

export interface DeliveryDetails {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  totalPurchases: number;
  invoiceCount: number;
  channelsUsed: SaleChannel[];
  lastOrderTimestamp?: number;
  totalPoints: number; // Loyalty points
  lastVisit?: number;
}

export type Role = 'admin' | 'cashier' | 'delivery';

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: Role;
  baseSalary: number;
  joinDate: string;
  isActive: boolean;
  notes?: string;
  vehicleId?: string;
}

export type Driver = Employee;

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  timestamp: number;
  checkIn?: number;
  checkOut?: number;
  breaks: { start: number; end?: number }[];
  status: 'present' | 'on_break' | 'completed' | 'late' | 'absent';
}

export interface SalaryTransaction {
  id: string;
  employeeId: string;
  amount: number;
  type: 'salary' | 'advance' | 'bonus';
  timestamp: number;
  notes?: string;
}

export interface StockLog {
  id: string;
  productId: string;
  oldStock: number;
  newStock: number;
  reason: string;
  timestamp: number;
  employeeId: string;
}

export type SaleChannel = 'store' | 'social_media' | 'website';

export interface Sale {
  id: string;
  timestamp: number;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  saleChannel: SaleChannel;
  customerId?: string;
  isDelivery?: boolean;
  deliveryDetails?: DeliveryDetails;
  deliveryFee?: number;
  driverId?: string;
  totalCost: number; // Financial Pro
  totalProfit: number; // Financial Pro
  pointsEarned: number; // Loyalty Pro
}

export interface DraftInvoice {
  id: string;
  timestamp: number;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  saleChannel: SaleChannel;
  customerId?: string;
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
  employeeId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  action: string;
  details: string;
  category: 'sale' | 'inventory' | 'expense' | 'return' | 'system' | 'cash' | 'wholesale' | 'delivery' | 'hr';
}

export interface WholesalePartner {
  id: string;
  name: string;
  contact: string;
  type: 'buyer' | 'supplier';
  createdAt: number;
}

export interface WholesalePayment {
  amount: number;
  timestamp: number;
  remainingAfter: number;
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
  payments?: WholesalePayment[];
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
  drivers: Employee[];
  customers: Customer[];
  employees: Employee[];
  attendance: Attendance[];
  salaryTransactions: SalaryTransaction[];
  categories: string[];
  stockLogs: StockLog[];
  initialCash: number;
  draftExpiryMinutes: number;
  lastBackupTimestamp?: number;
  currency?: string;
}

export type ViewType = 'dashboard' | 'sales' | 'inventory' | 'expenses' | 'intelligence' | 'settings' | 'returns' | 'reports' | 'logs' | 'wholesale' | 'delivery' | 'customers' | 'hr';