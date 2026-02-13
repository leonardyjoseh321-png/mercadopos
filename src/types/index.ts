export interface Product {
  id: string;
  name: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  categoryId: string;
  minStock: number;
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

export interface PaymentEntry {
  id: string;
  method: 'cash_usd' | 'cash_bs' | 'card' | 'mobile_payment' | 'transfer';
  amount: number;
  currencyCode: string;
  amountUsd: number;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  customerCedula: string;
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
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rate: number;
  isBase: boolean;
}

export interface CashRegister {
  id: string;
  openDate: string;
  closeDate?: string;
  openingAmounts: Record<string, number>;
  status: 'open' | 'closed';
  type?: 'X' | 'Z';
}

export interface CashOutflow {
  id: string;
  amount: number;
  currencyCode: string;
  reason: string;
  cashRegisterId: string;
  createdAt: string;
}

export interface StockAudit {
  id: string;
  productId: string;
  productName: string;
  systemQty: number;
  actualQty: number;
  difference: number;
  explanation: string;
  createdAt: string;
}

export interface SettingEntry {
  key: string;
  value: string | number | boolean;
}
