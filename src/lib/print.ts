import type { Sale, Currency, SettingEntry } from '@/types';
import { formatCurrency } from './currency';

export function printReceipt(sale: Sale, currencies: Currency[], settings: Record<string, string | number | boolean>) {
  const displayCurrency = currencies.find(c => c.isBase) || currencies[0];
  const width = settings.printerWidth === '58mm' ? '58mm' : '80mm';

  const html = `<!DOCTYPE html>
<html><head><style>
  @page { size: ${width} auto; margin: 2mm; }
  body { font-family: 'Courier New', monospace; font-size: 10px; width: ${width === '58mm' ? '44mm' : '68mm'}; margin: 0 auto; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; }
  .right { text-align: right; }
</style></head><body>
  <div class="center bold">${settings.businessName || 'Mi Negocio'}</div>
  ${settings.businessId ? `<div class="center">RIF/NIT: ${settings.businessId}</div>` : ''}
  ${settings.businessAddress ? `<div class="center">${settings.businessAddress}</div>` : ''}
  ${settings.businessPhone ? `<div class="center">Tel: ${settings.businessPhone}</div>` : ''}
  <div class="line"></div>
  <div>Factura: ${sale.id.slice(0, 8).toUpperCase()}</div>
  <div>Fecha: ${new Date(sale.createdAt).toLocaleString('es')}</div>
  <div>Cliente: ${sale.customerName} (${sale.customerCedula})</div>
  <div class="line"></div>
  ${sale.items.map(item => `
    <div>${item.productName}</div>
    <div class="row"><span>${item.quantity} x ${displayCurrency ? formatCurrency(item.priceUsd, displayCurrency) : `$${item.priceUsd.toFixed(2)}`}</span><span>${displayCurrency ? formatCurrency(item.totalUsd, displayCurrency) : `$${item.totalUsd.toFixed(2)}`}</span></div>
  `).join('')}
  <div class="line"></div>
  <div class="row"><span>Subtotal:</span><span>${displayCurrency ? formatCurrency(sale.subtotalUsd, displayCurrency) : `$${sale.subtotalUsd.toFixed(2)}`}</span></div>
  <div class="row"><span>${settings.taxName || 'IVA'} (${settings.taxRate || 16}%):</span><span>${displayCurrency ? formatCurrency(sale.taxAmount, displayCurrency) : `$${sale.taxAmount.toFixed(2)}`}</span></div>
  <div class="row bold"><span>TOTAL:</span><span>${displayCurrency ? formatCurrency(sale.totalUsd, displayCurrency) : `$${sale.totalUsd.toFixed(2)}`}</span></div>
  <div class="line"></div>
  ${sale.payments.map(p => `<div class="row"><span>${p.method}</span><span>${p.currencyCode} ${p.amount.toFixed(2)}</span></div>`).join('')}
  <div class="line"></div>
  <div class="center">${settings.ticketFooter || '¡Gracias por su compra!'}</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=300,height=600');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}
