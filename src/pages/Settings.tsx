import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { settingsDB, currenciesDB, exportDatabase, importDatabase } from '@/lib/db';
import { Download, Upload, Save, DollarSign, Plus, Trash2, Pencil, Star } from 'lucide-react';
import type { Currency, PaymentMethod } from '@/types';
import { toast } from 'sonner';

export default function Settings() {
  const [businessName, setBusinessName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [taxRate, setTaxRate] = useState('16');
  const [taxName, setTaxName] = useState('IVA');
  const [ticketFooter, setTicketFooter] = useState('');
  const [printerWidth, setPrinterWidth] = useState('80mm');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [editRate, setEditRate] = useState<Record<string, string>>({});

  // New currency dialog
  const [showNewCurrency, setShowNewCurrency] = useState(false);
  const [newCurrCode, setNewCurrCode] = useState('');
  const [newCurrName, setNewCurrName] = useState('');
  const [newCurrSymbol, setNewCurrSymbol] = useState('');
  const [newCurrRate, setNewCurrRate] = useState('1');

  // Payment method dialog
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [methodCurrencyId, setMethodCurrencyId] = useState('');
  const [newMethodName, setNewMethodName] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const settings = await settingsDB.getAll();
    const map: Record<string, any> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    setBusinessName(map.businessName || '');
    setBusinessId(map.businessId || '');
    setBusinessAddress(map.businessAddress || '');
    setBusinessPhone(map.businessPhone || '');
    setTaxRate(String(map.taxRate || 16));
    setTaxName(map.taxName || 'IVA');
    setTicketFooter(map.ticketFooter || '');
    setPrinterWidth(map.printerWidth || '80mm');

    const currs = await currenciesDB.getAll();
    setCurrencies(currs);
    const rates: Record<string, string> = {};
    currs.forEach(c => { rates[c.id] = String(c.rate); });
    setEditRate(rates);
  };

  const saveSettings = async () => {
    const entries: Record<string, string | number> = {
      businessName, businessId, businessAddress, businessPhone,
      taxRate: parseFloat(taxRate), taxName, ticketFooter, printerWidth,
    };
    for (const [key, value] of Object.entries(entries)) {
      await settingsDB.put({ key, value });
    }
    toast.success('Configuración guardada');
  };

  const saveCurrencyRate = async (c: Currency) => {
    const newRate = parseFloat(editRate[c.id]);
    if (!newRate || newRate <= 0) return;
    c.rate = newRate;
    await currenciesDB.put(c);
    toast.success(`Tasa de ${c.name} actualizada`);
    loadData();
  };

  const setAsDisplayCurrency = async (currencyId: string) => {
    for (const c of currencies) {
      c.isBase = c.id === currencyId;
      await currenciesDB.put(c);
    }
    toast.success('Moneda de visualización actualizada');
    loadData();
  };

  const addCurrency = async () => {
    if (!newCurrCode || !newCurrName || !newCurrSymbol) return;
    const id = newCurrCode.toLowerCase();
    const currency: Currency = {
      id,
      code: newCurrCode.toUpperCase(),
      name: newCurrName,
      symbol: newCurrSymbol,
      rate: parseFloat(newCurrRate) || 1,
      isBase: false,
      paymentMethods: [
        { id: `cash_${id}`, name: `Efectivo ${newCurrCode.toUpperCase()}`, currencyId: id },
      ],
    };
    await currenciesDB.put(currency);
    setShowNewCurrency(false);
    setNewCurrCode(''); setNewCurrName(''); setNewCurrSymbol(''); setNewCurrRate('1');
    toast.success('Divisa agregada');
    loadData();
  };

  const deleteCurrency = async (id: string) => {
    if (id === 'usd') { toast.error('No se puede eliminar el dólar'); return; }
    await currenciesDB.delete(id);
    toast.success('Divisa eliminada');
    loadData();
  };

  const openAddMethod = (currencyId: string) => {
    setMethodCurrencyId(currencyId);
    setNewMethodName('');
    setShowAddMethod(true);
  };

  const addPaymentMethod = async () => {
    if (!newMethodName) return;
    const currency = currencies.find(c => c.id === methodCurrencyId);
    if (!currency) return;
    const methods = currency.paymentMethods || [];
    methods.push({
      id: `${methodCurrencyId}_${Date.now()}`,
      name: newMethodName,
      currencyId: methodCurrencyId,
    });
    currency.paymentMethods = methods;
    await currenciesDB.put(currency);
    setShowAddMethod(false);
    toast.success('Método de pago agregado');
    loadData();
  };

  const deletePaymentMethod = async (currencyId: string, methodId: string) => {
    const currency = currencies.find(c => c.id === currencyId);
    if (!currency) return;
    currency.paymentMethods = (currency.paymentMethods || []).filter(m => m.id !== methodId);
    await currenciesDB.put(currency);
    toast.success('Método de pago eliminado');
    loadData();
  };

  const handleExport = async () => {
    const json = await exportDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Base de datos exportada');
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      await importDatabase(text);
      toast.success('Base de datos importada');
      loadData();
    };
    input.click();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      {/* Business Info */}
      <div className="pos-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Datos del Negocio</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Nombre del Negocio</Label><Input value={businessName} onChange={e => setBusinessName(e.target.value)} /></div>
          <div><Label>NIT / RIF</Label><Input value={businessId} onChange={e => setBusinessId(e.target.value)} placeholder="J-12345678-9" /></div>
          <div><Label>Dirección</Label><Input value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} /></div>
          <div><Label>Teléfono</Label><Input value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} /></div>
        </div>
      </div>

      {/* Tax */}
      <div className="pos-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Impuesto General</h2>
        <p className="text-xs text-muted-foreground mb-3">Este impuesto se aplica a todos los productos que no tengan un impuesto personalizado.</p>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Nombre del Impuesto</Label><Input value={taxName} onChange={e => setTaxName(e.target.value)} /></div>
          <div><Label>Tasa (%)</Label><Input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} /></div>
        </div>
      </div>

      {/* Currencies */}
      <div className="pos-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><DollarSign size={20} /> Divisas y Métodos de Pago</h2>
          <Button size="sm" onClick={() => setShowNewCurrency(true)} className="gap-1"><Plus size={14} /> Nueva Divisa</Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Los precios se guardan en USD. La moneda marcada con ★ es la que se muestra en pantalla.
        </p>
        <div className="space-y-4">
          {currencies.map(c => (
            <div key={c.id} className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium">{c.symbol} {c.name} ({c.code})</p>
                  {c.isBase && <span className="text-xs text-primary font-medium">★ Moneda de visualización</span>}
                </div>
                <div className="flex items-center gap-2">
                  {c.code !== 'USD' && (
                    <>
                      <Label className="text-xs whitespace-nowrap">1 USD =</Label>
                      <Input
                        type="number" step="0.01" className="w-28"
                        value={editRate[c.id] || ''}
                        onChange={e => setEditRate(prev => ({ ...prev, [c.id]: e.target.value }))}
                      />
                      <span className="text-sm text-muted-foreground">{c.code}</span>
                      <Button size="sm" onClick={() => saveCurrencyRate(c)}>Guardar</Button>
                    </>
                  )}
                  {!c.isBase && (
                    <Button size="sm" variant="outline" onClick={() => setAsDisplayCurrency(c.id)} title="Usar como moneda de visualización">
                      <Star size={14} />
                    </Button>
                  )}
                  {c.code !== 'USD' && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCurrency(c.id)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="pl-4 border-l-2 border-primary/20">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">Métodos de pago</Label>
                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => openAddMethod(c.id)}>
                    <Plus size={12} /> Agregar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(c.paymentMethods || []).map(m => (
                    <span key={m.id} className="inline-flex items-center gap-1 text-xs bg-background px-2 py-1 rounded border">
                      {m.name}
                      <button onClick={() => deletePaymentMethod(c.id, m.id)} className="text-destructive hover:text-destructive/80">
                        <Trash2 size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Printer */}
      <div className="pos-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Impresión</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Ancho del Ticket</Label>
            <Select value={printerWidth} onValueChange={setPrinterWidth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm</SelectItem>
                <SelectItem value="80mm">80mm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Pie de Ticket</Label><Input value={ticketFooter} onChange={e => setTicketFooter(e.target.value)} /></div>
        </div>
      </div>

      <Button onClick={saveSettings} className="w-full gap-2 mb-6"><Save size={16} /> Guardar Configuración</Button>

      <Separator className="my-6" />

      {/* Backup */}
      <div className="pos-card p-6">
        <h2 className="text-lg font-semibold mb-4">Respaldos</h2>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport} className="flex-1 gap-2"><Download size={16} /> Exportar JSON</Button>
          <Button variant="outline" onClick={handleImport} className="flex-1 gap-2"><Upload size={16} /> Importar JSON</Button>
        </div>
      </div>

      {/* New Currency Dialog */}
      <Dialog open={showNewCurrency} onOpenChange={setShowNewCurrency}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva Divisa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código (ej: COP)</Label><Input value={newCurrCode} onChange={e => setNewCurrCode(e.target.value)} maxLength={5} /></div>
              <div><Label>Símbolo (ej: $)</Label><Input value={newCurrSymbol} onChange={e => setNewCurrSymbol(e.target.value)} maxLength={5} /></div>
            </div>
            <div><Label>Nombre</Label><Input value={newCurrName} onChange={e => setNewCurrName(e.target.value)} placeholder="Peso Colombiano" /></div>
            <div><Label>Tasa (1 USD = ?)</Label><Input type="number" value={newCurrRate} onChange={e => setNewCurrRate(e.target.value)} /></div>
            <Button onClick={addCurrency} className="w-full" disabled={!newCurrCode || !newCurrName || !newCurrSymbol}>Agregar Divisa</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddMethod} onOpenChange={setShowAddMethod}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Método de Pago</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre del Método</Label><Input value={newMethodName} onChange={e => setNewMethodName(e.target.value)} placeholder="Ej: Zelle, Binance, Nequi" /></div>
            <Button onClick={addPaymentMethod} className="w-full" disabled={!newMethodName}>Agregar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
