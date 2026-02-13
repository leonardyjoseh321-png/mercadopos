import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { salesDB, cashRegistersDB, cashOutflowsDB, currenciesDB } from '@/lib/db';
import { formatCurrency, getMethodLabel } from '@/lib/currency';
import { DoorOpen, DoorClosed, FileText, MinusCircle } from 'lucide-react';
import type { CashRegister, Sale, CashOutflow, Currency } from '@/types';

export default function CashRegisterPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [openRegister, setOpenRegister] = useState<CashRegister | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [showOpen, setShowOpen] = useState(false);
  const [showOutflow, setShowOutflow] = useState(false);
  const [showReport, setShowReport] = useState<{ register: CashRegister; sales: Sale[]; outflows: CashOutflow[] } | null>(null);
  const [openingAmounts, setOpeningAmounts] = useState<Record<string, string>>({});
  const [outflowAmount, setOutflowAmount] = useState('');
  const [outflowCurrency, setOutflowCurrency] = useState('usd');
  const [outflowReason, setOutflowReason] = useState('');

  const displayCurrency = currencies.find(c => c.isBase) || currencies[0];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [regs, currs] = await Promise.all([cashRegistersDB.getAll(), currenciesDB.getAll()]);
    setRegisters(regs.sort((a, b) => b.openDate.localeCompare(a.openDate)));
    setCurrencies(currs);
    setOpenRegister(regs.find(r => r.status === 'open') || null);
  };

  const openCashRegister = async () => {
    const amounts: Record<string, number> = {};
    for (const [k, v] of Object.entries(openingAmounts)) { amounts[k] = parseFloat(v) || 0; }
    const reg: CashRegister = {
      id: crypto.randomUUID(),
      openDate: new Date().toISOString(),
      openingAmounts: amounts,
      status: 'open',
    };
    await cashRegistersDB.put(reg);
    setShowOpen(false);
    loadData();
  };

  const generateReport = async (reg: CashRegister, type: 'X' | 'Z') => {
    const allSales = await salesDB.getAll();
    const regSales = allSales.filter(s => s.status === 'completed' && s.cashRegisterId === reg.id ||
      (s.status === 'completed' && s.createdAt >= reg.openDate && (!reg.closeDate || s.createdAt <= reg.closeDate)));
    const outflows = await cashOutflowsDB.getByRegister(reg.id);

    if (type === 'Z') {
      reg.closeDate = new Date().toISOString();
      reg.status = 'closed';
      reg.type = 'Z';
      await cashRegistersDB.put(reg);
      loadData();
    }

    setShowReport({ register: reg, sales: regSales, outflows });
  };

  const addOutflow = async () => {
    if (!openRegister || !outflowAmount || !outflowReason) return;
    const outflow: CashOutflow = {
      id: crypto.randomUUID(),
      amount: parseFloat(outflowAmount),
      currencyCode: currencies.find(c => c.id === outflowCurrency)?.code || 'USD',
      reason: outflowReason,
      cashRegisterId: openRegister.id,
      createdAt: new Date().toISOString(),
    };
    await cashOutflowsDB.put(outflow);
    setShowOutflow(false);
    setOutflowAmount('');
    setOutflowReason('');
  };

  const formatPrice = (usd: number) => displayCurrency ? formatCurrency(usd, displayCurrency) : `$ ${usd.toFixed(2)}`;

  // Report calculations
  const reportTotalsByMethod = (sales: Sale[]) => {
    const totals: Record<string, number> = {};
    sales.forEach(s => s.payments.forEach(p => {
      const key = `${getMethodLabel(p.method)} (${p.currencyCode})`;
      totals[key] = (totals[key] || 0) + p.amount;
    }));
    return totals;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Caja Registradora</h1>
          <p className="text-sm text-muted-foreground">
            {openRegister ? 'Caja abierta' : 'Caja cerrada'}
          </p>
        </div>
        <div className="flex gap-2">
          {!openRegister ? (
            <Button onClick={() => setShowOpen(true)} className="gap-2"><DoorOpen size={16} /> Abrir Caja</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowOutflow(true)} className="gap-2"><MinusCircle size={16} /> Salida de Dinero</Button>
              <Button variant="outline" onClick={() => generateReport(openRegister, 'X')} className="gap-2"><FileText size={16} /> Corte X</Button>
              <Button onClick={() => generateReport(openRegister, 'Z')} className="gap-2"><DoorClosed size={16} /> Corte Z (Cerrar)</Button>
            </>
          )}
        </div>
      </div>

      {/* Registers History */}
      <div className="pos-card-flat overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Apertura</TableHead>
              <TableHead>Cierre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registers.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{new Date(r.openDate).toLocaleString('es')}</TableCell>
                <TableCell className="text-sm">{r.closeDate ? new Date(r.closeDate).toLocaleString('es') : '—'}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'open' ? 'default' : 'secondary'}>
                    {r.status === 'open' ? 'Abierta' : 'Cerrada'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => generateReport(r, 'X')}>Ver Reporte</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Open Register Dialog */}
      <Dialog open={showOpen} onOpenChange={setShowOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir Caja</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ingrese el monto inicial por moneda:</p>
            {currencies.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <Label className="w-24">{c.symbol} {c.code}</Label>
                <Input
                  type="number"
                  value={openingAmounts[c.id] || ''}
                  onChange={e => setOpeningAmounts(prev => ({ ...prev, [c.id]: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            ))}
            <Button onClick={openCashRegister} className="w-full">Abrir Caja</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Outflow Dialog */}
      <Dialog open={showOutflow} onOpenChange={setShowOutflow}>
        <DialogContent>
          <DialogHeader><DialogTitle>Salida de Dinero</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input type="number" value={outflowAmount} onChange={e => setOutflowAmount(e.target.value)} placeholder="Monto" />
              <select className="border rounded-md px-3" value={outflowCurrency} onChange={e => setOutflowCurrency(e.target.value)}>
                {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </div>
            <div><Label>Motivo</Label><Input value={outflowReason} onChange={e => setOutflowReason(e.target.value)} placeholder="Ej: Compra de insumos" /></div>
            <Button onClick={addOutflow} className="w-full" disabled={!outflowAmount || !outflowReason}>Registrar Salida</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={!!showReport} onOpenChange={() => setShowReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Reporte {showReport?.register.type === 'Z' ? 'Corte Z' : 'Corte X'}
            </DialogTitle>
          </DialogHeader>
          {showReport && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p>Apertura: {new Date(showReport.register.openDate).toLocaleString('es')}</p>
                {showReport.register.closeDate && <p>Cierre: {new Date(showReport.register.closeDate).toLocaleString('es')}</p>}
                <p>Ventas: {showReport.sales.length}</p>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Totales por Método de Pago</h3>
                {Object.entries(reportTotalsByMethod(showReport.sales)).map(([method, total]) => (
                  <div key={method} className="flex justify-between text-sm p-2 bg-secondary/50 rounded mb-1">
                    <span>{method}</span>
                    <span className="font-semibold">{total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {showReport.outflows.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Salidas de Dinero</h3>
                  {showReport.outflows.map(o => (
                    <div key={o.id} className="flex justify-between text-sm p-2 bg-destructive/5 rounded mb-1">
                      <span>{o.reason}</span>
                      <span>{o.currencyCode} {o.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="font-semibold">
                  Total Neto: {formatPrice(showReport.sales.reduce((s, sale) => s + sale.totalUsd, 0))}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
