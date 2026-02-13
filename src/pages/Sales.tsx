import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { salesDB, productsDB, currenciesDB } from '@/lib/db';
import { formatCurrency, getMethodLabel } from '@/lib/currency';
import { RotateCcw, Eye, Search } from 'lucide-react';
import type { Sale, Currency } from '@/types';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<Currency | null>(null);
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [s, c] = await Promise.all([salesDB.getAll(), currenciesDB.getAll()]);
      setSales(s.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setDisplayCurrency(c.find(x => x.isBase) || c[0] || null);
    })();
  }, []);

  const formatPrice = (usd: number) => displayCurrency ? formatCurrency(usd, displayCurrency) : `$ ${usd.toFixed(2)}`;

  const voidSale = async (sale: Sale) => {
    if (!confirm('¿Anular esta venta? El stock será devuelto.')) return;
    sale.status = 'voided';
    sale.updatedAt = new Date().toISOString();
    await salesDB.put(sale);
    // Restore stock
    for (const item of sale.items) {
      const p = await productsDB.get(item.productId);
      if (p) {
        p.stock += item.quantity;
        await productsDB.put(p);
      }
    }
    setSales(await salesDB.getAll().then(s => s.sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
  };

  const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    completed: { label: 'Completada', variant: 'default' },
    parked: { label: 'En Espera', variant: 'outline' },
    pending: { label: 'Pendiente', variant: 'secondary' },
    voided: { label: 'Anulada', variant: 'destructive' },
  };

  const filtered = sales.filter(s =>
    !search || s.customerName.toLowerCase().includes(search.toLowerCase()) || s.customerCedula.includes(search) || s.id.includes(search)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Historial de Ventas</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente o ID..." className="pl-10" />
      </div>

      <div className="pos-card-flat overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="text-sm">{new Date(s.createdAt).toLocaleString('es')}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{s.customerName}</p>
                    <p className="text-xs text-muted-foreground">{s.customerCedula}</p>
                  </div>
                </TableCell>
                <TableCell>{s.items.reduce((sum, i) => sum + i.quantity, 0)}</TableCell>
                <TableCell className="text-right font-semibold">{formatPrice(s.totalUsd)}</TableCell>
                <TableCell>
                  <Badge variant={statusLabel[s.status]?.variant || 'secondary'}>
                    {statusLabel[s.status]?.label || s.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewSale(s)}>
                      <Eye size={14} />
                    </Button>
                    {s.status === 'completed' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => voidSale(s)}>
                        <RotateCcw size={14} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewSale} onOpenChange={() => setViewSale(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalle de Venta</DialogTitle></DialogHeader>
          {viewSale && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p>ID: {viewSale.id.slice(0, 8).toUpperCase()}</p>
                <p>Fecha: {new Date(viewSale.createdAt).toLocaleString('es')}</p>
                <p>Cliente: {viewSale.customerName} ({viewSale.customerCedula})</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Productos</h3>
                {viewSale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm p-2 bg-secondary/50 rounded mb-1">
                    <span>{item.quantity}x {item.productName}</span>
                    <span>{formatPrice(item.totalUsd)}</span>
                  </div>
                ))}
              </div>
              <div className="text-sm space-y-1 border-t pt-2">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(viewSale.subtotalUsd)}</span></div>
                <div className="flex justify-between"><span>Impuesto</span><span>{formatPrice(viewSale.taxAmount)}</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span>{formatPrice(viewSale.totalUsd)}</span></div>
              </div>
              {viewSale.payments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Pagos</h3>
                  {viewSale.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm p-2 bg-primary/5 rounded mb-1">
                      <span>{getMethodLabel(p.method)}</span>
                      <span>{p.currencyCode} {p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
