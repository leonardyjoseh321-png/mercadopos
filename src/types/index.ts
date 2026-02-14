export type UnitType = 'unidad' | 'kilo' | 'litro' | 'caja' | 'metro' | 'gramo' | 'libra';

export type EmployeePermission =
  | 'pos'
  | 'products'
  | 'customers'
  | 'sales'
  | 'cash_register'
  | 'reports'
  | 'settings'
  | 'employees';

export const PERMISSION_LABELS: Record<EmployeePermission, string> = {
  pos: 'Punto de Venta',
  products: 'Inventario',
  customers: 'Clientes',
  sales: 'Ventas',
  cash_register: 'Caja',
  reports: 'Reportes',
  settings: 'Configuración',
  employees: 'Empleados',
};

export type EmployeeRole = 'admin' | 'cajero' | 'supervisor';

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'Administrador',
  cajero: 'Cajero',
  supervisor: 'Supervisor',
};

export const ROLE_DEFAULT_PERMISSIONS: Record<EmployeeRole, EmployeePermission[]> = {
  admin: ['pos', 'products', 'customers', 'sales', 'cash_register', 'reports', 'settings', 'employees'],
  supervisor: ['pos', 'products', 'customers', 'sales', 'cash_register', 'reports'],
  cajero: ['pos', 'customers', 'sales', 'cash_register'],
};

export interface Employee {
  id: string;
  email: string;
  name: string;
  role: EmployeeRole;
  permissions: EmployeePermission[];
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  categoryId: string;
  minStock: number;
  unit: UnitType;
  unitsPerPackage?: number;
  packageName?: string;
  hasCustomTax: boolean;
  customTaxRate?: number;
  customTaxName?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  cedula: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  currencyId: string;
}

export interface PaymentEntry {
  id: string;
  method: string;
  amount: number;
  currencyCode: string;
  amountUsd: number;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  customerCedula: string;
  employeeId?: string;
  employeeName?: string;
  items: SaleItem[];
  payments: PaymentEntry[];
  totalUsd: number;
  taxAmount: number;
  subtotalUsd: number;
  status: 'completed' | 'parked' | 'pending' | 'voided';
  cashRegisterId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  priceUsd: number;
  totalUsd: number;
  taxRate: number;
  taxAmount: number;
  unit: UnitType;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rate: number;
  isBase: boolean;
  paymentMethods: PaymentMethod[];
}

export interface CashRegister {
  id: string;
  openDate: string;
  closeDate?: string;
  openingAmounts: Record<string, number>;
  status: 'open' | 'closed';
  type?: 'X' | 'Z';
  employeeId?: string;
  employeeName?: string;
}

export interface CashOutflow {
  id: string;
  amount: number;
  currencyCode: string;
  reason: string;
  cashRegisterId: string;
  employeeId?: string;
  employeeName?: string;
  createdAt: string;
}

export type AdjustmentReason =
  | 'damaged'
  | 'expired'
  | 'lost'
  | 'stolen'
  | 'donation'
  | 'return_supplier'
  | 'input_error'
  | 'other';

export const ADJUSTMENT_REASONS: Record<AdjustmentReason, string> = {
  damaged: 'Producto dañado',
  expired: 'Producto vencido',
  lost: 'Pérdida / Extravío',
  stolen: 'Robo',
  donation: 'Donación',
  return_supplier: 'Devolución a proveedor',
  input_error: 'Error de carga',
  other: 'Otro',
};

export interface StockAudit {
  id: string;
  productId: string;
  productName: string;
  systemQty: number;
  actualQty: number;
  difference: number;
  reason: AdjustmentReason;
  explanation: string;
  employeeId?: string;
  employeeName?: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  difference: number;
  reason: AdjustmentReason;
  explanation: string;
  employeeId?: string;
  employeeName?: string;
  createdAt: string;
}

export interface SettingEntry {
  key: string;
  value: string | number | boolean;
}
