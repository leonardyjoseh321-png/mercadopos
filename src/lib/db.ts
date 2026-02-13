import { openDB, type IDBPDatabase } from 'idb';
import type { Product, Category, Customer, Sale, Currency, CashRegister, CashOutflow, StockAudit, SettingEntry } from '@/types';

const DB_NAME = 'pos-system';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const products = db.createObjectStore('products', { keyPath: 'id' });
      products.createIndex('by-barcode', 'barcode');
      products.createIndex('by-category', 'categoryId');

      db.createObjectStore('categories', { keyPath: 'id' });

      const customers = db.createObjectStore('customers', { keyPath: 'id' });
      customers.createIndex('by-cedula', 'cedula');

      const sales = db.createObjectStore('sales', { keyPath: 'id' });
      sales.createIndex('by-status', 'status');
      sales.createIndex('by-date', 'createdAt');

      db.createObjectStore('currencies', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'key' });
      db.createObjectStore('cashRegisters', { keyPath: 'id' });

      const outflows = db.createObjectStore('cashOutflows', { keyPath: 'id' });
      outflows.createIndex('by-register', 'cashRegisterId');

      db.createObjectStore('stockAudits', { keyPath: 'id' });
    },
  });
  return dbInstance;
}

// Products
export const productsDB = {
  async getAll(): Promise<Product[]> { return (await getDB()).getAll('products'); },
  async get(id: string): Promise<Product | undefined> { return (await getDB()).get('products', id); },
  async getByBarcode(barcode: string): Promise<Product | undefined> { return (await getDB()).getFromIndex('products', 'by-barcode', barcode); },
  async put(p: Product) { return (await getDB()).put('products', p); },
  async delete(id: string) { return (await getDB()).delete('products', id); },
};

// Categories
export const categoriesDB = {
  async getAll(): Promise<Category[]> { return (await getDB()).getAll('categories'); },
  async put(c: Category) { return (await getDB()).put('categories', c); },
  async delete(id: string) { return (await getDB()).delete('categories', id); },
};

// Customers
export const customersDB = {
  async getAll(): Promise<Customer[]> { return (await getDB()).getAll('customers'); },
  async get(id: string): Promise<Customer | undefined> { return (await getDB()).get('customers', id); },
  async getByCedula(cedula: string): Promise<Customer | undefined> { return (await getDB()).getFromIndex('customers', 'by-cedula', cedula); },
  async put(c: Customer) { return (await getDB()).put('customers', c); },
  async delete(id: string) { return (await getDB()).delete('customers', id); },
};

// Sales
export const salesDB = {
  async getAll(): Promise<Sale[]> { return (await getDB()).getAll('sales'); },
  async get(id: string): Promise<Sale | undefined> { return (await getDB()).get('sales', id); },
  async getByStatus(status: string): Promise<Sale[]> { return (await getDB()).getAllFromIndex('sales', 'by-status', status); },
  async put(s: Sale) { return (await getDB()).put('sales', s); },
  async delete(id: string) { return (await getDB()).delete('sales', id); },
};

// Currencies
export const currenciesDB = {
  async getAll(): Promise<Currency[]> { return (await getDB()).getAll('currencies'); },
  async get(id: string): Promise<Currency | undefined> { return (await getDB()).get('currencies', id); },
  async put(c: Currency) { return (await getDB()).put('currencies', c); },
};

// Settings
export const settingsDB = {
  async getAll(): Promise<SettingEntry[]> { return (await getDB()).getAll('settings'); },
  async get(key: string): Promise<SettingEntry | undefined> { return (await getDB()).get('settings', key); },
  async put(s: SettingEntry) { return (await getDB()).put('settings', s); },
};

// Cash Registers
export const cashRegistersDB = {
  async getAll(): Promise<CashRegister[]> { return (await getDB()).getAll('cashRegisters'); },
  async get(id: string): Promise<CashRegister | undefined> { return (await getDB()).get('cashRegisters', id); },
  async put(r: CashRegister) { return (await getDB()).put('cashRegisters', r); },
};

// Cash Outflows
export const cashOutflowsDB = {
  async getAll(): Promise<CashOutflow[]> { return (await getDB()).getAll('cashOutflows'); },
  async getByRegister(registerId: string): Promise<CashOutflow[]> { return (await getDB()).getAllFromIndex('cashOutflows', 'by-register', registerId); },
  async put(o: CashOutflow) { return (await getDB()).put('cashOutflows', o); },
};

// Stock Audits
export const stockAuditsDB = {
  async getAll(): Promise<StockAudit[]> { return (await getDB()).getAll('stockAudits'); },
  async put(a: StockAudit) { return (await getDB()).put('stockAudits', a); },
};

// Initialize DB with defaults
export async function initializeDB() {
  const currencies = await currenciesDB.getAll();
  if (currencies.length === 0) {
    await currenciesDB.put({ id: 'usd', code: 'USD', name: 'Dólar', symbol: '$', rate: 1, isBase: false });
    await currenciesDB.put({ id: 'ves', code: 'VES', name: 'Bolívar', symbol: 'Bs', rate: 50, isBase: true });
  }

  const settings = await settingsDB.getAll();
  if (settings.length === 0) {
    const defaults: Record<string, string | number> = {
      businessName: 'Mi Negocio',
      businessId: '',
      businessAddress: '',
      businessPhone: '',
      taxRate: 16,
      taxName: 'IVA',
      ticketFooter: '¡Gracias por su compra!',
      printerWidth: '80mm',
    };
    for (const [key, value] of Object.entries(defaults)) {
      await settingsDB.put({ key, value });
    }
  }
}

// Export entire DB as JSON
export async function exportDatabase(): Promise<string> {
  const data = {
    products: await productsDB.getAll(),
    categories: await categoriesDB.getAll(),
    customers: await customersDB.getAll(),
    sales: await salesDB.getAll(),
    currencies: await currenciesDB.getAll(),
    settings: await settingsDB.getAll(),
    cashRegisters: await cashRegistersDB.getAll(),
    cashOutflows: await cashOutflowsDB.getAll(),
    stockAudits: await stockAuditsDB.getAll(),
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// Import DB from JSON
export async function importDatabase(json: string) {
  const data = JSON.parse(json);
  const db = await getDB();
  const stores = ['products', 'categories', 'customers', 'sales', 'currencies', 'settings', 'cashRegisters', 'cashOutflows', 'stockAudits'] as const;
  for (const store of stores) {
    if (data[store]) {
      const tx = db.transaction(store, 'readwrite');
      await tx.store.clear();
      for (const item of data[store]) {
        await tx.store.put(item);
      }
      await tx.done;
    }
  }
}
