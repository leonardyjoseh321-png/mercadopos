import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { settingsDB, currenciesDB, exportDatabase, importDatabase } from '@/lib/db';
import { Download, Upload, Save, DollarSign } from 'lucide-react';
import type { Currency, SettingEntry } from '@/types';
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
        <h2 className="text-lg font-semibold mb-4">Impuestos</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Nombre del Impuesto</Label><Input value={taxName} onChange={e => setTaxName(e.target.value)} /></div>
          <div><Label>Tasa (%)</Label><Input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} /></div>
        </div>
      </div>

      {/* Currencies */}
      <div className="pos-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><DollarSign size={20} /> Divisas</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Los precios se guardan en USD. La moneda marcada como "Base" es la que se muestra en pantalla. Cambia la tasa para ajustar todos los precios.
        </p>
        <div className="space-y-3">
          {currencies.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{c.symbol} {c.name} ({c.code})</p>
                {c.isBase && <span className="text-xs text-primary font-medium">Moneda de visualización</span>}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">1 USD =</Label>
                <Input
                  type="number" step="0.01" className="w-28"
                  value={editRate[c.id] || ''}
                  onChange={e => setEditRate(prev => ({ ...prev, [c.id]: e.target.value }))}
                  disabled={c.code === 'USD'}
                />
                <span className="text-sm text-muted-foreground">{c.code}</span>
                {c.code !== 'USD' && <Button size="sm" onClick={() => saveCurrencyRate(c)}>Guardar</Button>}
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
    </div>
  );
}
