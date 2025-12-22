export interface Product {
  id: string;
  name: string;
  category: string;
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
}

export type Role = 'admin' | 'cashier' | 'delivery';

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: Role;
  baseSalary: number;
  joinDate: string; // Changed to string per requirements
  isActive: boolean;
  notes?: string;
  vehicleId?: string; // Maintained for role === 'delivery'
}

// Added Driver type alias to fix import errors in DeliveryScreen
export type Driver = Employee;

export interface Attendance {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD for uniqueness
  timestamp: number; // Added for UI filtering
  checkIn?: number;
  checkOut?: number;
  breaks: { start: number; end?: number }[];
  status: 'present' | 'on_break' | 'completed' | 'late' | 'absent'; // Added late and absent
}

export interface SalaryTransaction {
  id: string;
  employeeId: string;
  amount: number;
  type: 'salary' | 'advance' | 'bonus';
  timestamp: number;
  notes?: string;
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
  driverId?: string; // This links to an Employee with role 'delivery'
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
  drivers: Employee[]; // Added to fix missing property errors
  customers: Customer[]; // Added to fix missing property errors
  employees: Employee[]; // Unified Staff
  attendance: Attendance[];
  salaryTransactions: SalaryTransaction[];
  initialCash: number;
  draftExpiryMinutes: number;
  lastBackupTimestamp?: number;
  currency?: string;
}

export type ViewType = 'dashboard' | 'sales' | 'inventory' | 'expenses' | 'intelligence' | 'settings' | 'returns' | 'reports' | 'logs' | 'wholesale' | 'delivery' | 'customers' | 'hr';