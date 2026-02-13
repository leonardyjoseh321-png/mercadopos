import type { Currency } from '@/types';

export function formatCurrency(amountUsd: number, currency: Currency): string {
  const converted = amountUsd * currency.rate;
  return `${currency.symbol} ${converted.toFixed(2)}`;
}

export function formatAmount(amount: number, symbol: string): string {
  return `${symbol} ${amount.toFixed(2)}`;
}

export function convertToUsd(amount: number, rate: number): number {
  return amount / rate;
}

export function convertFromUsd(amountUsd: number, rate: number): number {
  return amountUsd * rate;
}

export function getMethodLabel(method: string, currencies?: Currency[]): string {
  // Try to find from dynamic payment methods
  if (currencies) {
    for (const c of currencies) {
      const found = (c.paymentMethods || []).find(m => m.id === method);
      if (found) return `${found.name} (${c.code})`;
    }
  }
  // Fallback for legacy data
  const labels: Record<string, string> = {
    cash_usd: 'Efectivo USD',
    cash_bs: 'Efectivo Bs',
    card: 'Tarjeta',
    mobile_payment: 'Pago Móvil',
    transfer: 'Transferencia',
  };
  return labels[method] || method;
}
