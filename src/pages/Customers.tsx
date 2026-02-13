import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { customersDB, salesDB } from '@/lib/db';
import type { Customer, Sale } from '@/types';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showDebt, setShowDebt] = useState<Customer | null>(null);
  const [pendingSales, setPendingSales] = useState<Sale[]>([]);
  const [abono, setAbono] = useState('');

  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setCustomers(await customersDB.getAll());
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.cedula.includes(search)
  );

  const openForm = (c?: Customer) => {
    setEditing(c || null);
    setName(c?.name || '');
    setCedula(c?.cedula || '');
    setPhone(c?.phone || '');
    setShowForm(true);
  };

  const save = async () => {
    await customersDB.put({
      id: editing?.id || crypto.randomUUID(),
      name, cedula, phone,
      createdAt: editing?.createdAt || new Date().toISOString(),
    });
    setShowForm(false);
    loadData();
  };

  const remove = async (id: string) => {
    await customersDB.delete(id);
    loadData();
  };

  const viewDebt = async (c: Customer) => {
    const all = await salesDB.getAll();
    const pending = all.filter(s => s.customerId === c.id && s.status === 'pending');
    setPendingSales(pending);
    setShowDebt(c);
  };

  const applyAbono = async (sale: Sale) => {
    const amt = parseFloat(abono);
    if (!amt || amt <= 0) return;
    sale.payments.push({
      id: crypto.randomUUID(),
      method: 'cash_usd',
      amount: amt,
      currencyCode: 'USD',
      amountUsd: amt,
    });
    const totalPaid = sale.payments.reduce((s, p) => s + p.amountUsd, 0);
    if (totalPaid >= sale.totalUsd) sale.status = 'completed';
    await salesDB.put(sale);
    setAbono('');
    viewDebt(showDebt!);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{customers.length} registrados</p>
        </div>
        <Button onClick={() => openForm()} className="gap-2"><Plus size={16} /> Nuevo Cliente</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o cédula..." className="pl-10" />
      </div>

      <div className="pos-card-flat overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.cedula}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(c.createdAt).toLocaleDateString('es')}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="outline" size="sm" onClick={() => viewDebt(c)}>Cuentas</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(c)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)}><Trash2 size={14} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cédula</Label><Input value={cedula} onChange={e => setCedula(e.target.value)} placeholder="V-12345678" /></div>
            <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>Teléfono</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0412-1234567" /></div>
            <Button onClick={save} className="w-full" disabled={!name || !cedula}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDebt} onOpenChange={() => setShowDebt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cuentas por Cobrar - {showDebt?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {pendingSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tiene cuentas pendientes</p>
            ) : (
              pendingSales.map(s => {
                const paid = s.payments.reduce((sum, p) => sum + p.amountUsd, 0);
                const remaining = s.totalUsd - paid;
                return (
                  <div key={s.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{new Date(s.createdAt).toLocaleDateString('es')}</span>
                      <span className="font-semibold">Debe: ${remaining.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Input type="number" placeholder="Abono $" value={abono} onChange={e => setAbono(e.target.value)} />
                      <Button size="sm" onClick={() => applyAbono(s)}>Abonar</Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
