import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { productsDB, salesDB, currenciesDB, cashOutflowsDB, employeesDB } from '@/lib/db';
import { formatCurrency, getMethodLabel } from '@/lib/currency';
import { DollarSign, ShoppingCart, AlertTriangle, TrendingUp, Calendar, Users, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Product, Sale, Currency, Employee, CashOutflow } from '@/types';

const COLORS = ['hsl(160, 84%, 39%)', 'hsl(217, 91%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(270, 70%, 60%)', 'hsl(180, 60%, 45%)'];

export default function Reports() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [outflows, setOutflows] = useState<CashOutflow[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<Currency | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [employeeFilter, setEmployeeFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const [s, p, c, e, o] = await Promise.all([
        salesDB.getAll(), productsDB.getAll(), currenciesDB.getAll(), employeesDB.getAll(), cashOutflowsDB.getAll(),
      ]);
      setSales(s);
      setProducts(p);
      setCurrencies(c);
      setEmployees(e);
      setOutflows(o);
      setDisplayCurrency(c.find(x => x.isBase) || c[0] || null);
    })();
  }, []);

  const formatPrice = (usd: number) => displayCurrency ? formatCurrency(usd, displayCurrency) : `$ ${usd.toFixed(2)}`;

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.status !== 'completed') return false;
      const dateOk = s.createdAt.slice(0, 10) >= dateFrom && s.createdAt.slice(0, 10) <= dateTo;
      const empOk = employeeFilter === 'all' || s.employeeId === employeeFilter;
      return dateOk && empOk;
    });
  }, [sales, dateFrom, dateTo, employeeFilter]);

  const filteredOutflows = useMemo(() =>
    outflows.filter(o => o.createdAt.slice(0, 10) >= dateFrom && o.createdAt.slice(0, 10) <= dateTo),
    [outflows, dateFrom, dateTo]
  );

  // KPIs
  const totalRevenue = filteredSales.reduce((s, sale) => s + sale.totalUsd, 0);
  const totalTax = filteredSales.reduce((s, sale) => s + sale.taxAmount, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => {
    return sum + sale.items.reduce((s, item) => {
      const p = products.find(x => x.id === item.productId);
      return s + (item.priceUsd - (p?.costPrice || 0)) * item.quantity;
    }, 0);
  }, 0);
  const totalItems = filteredSales.reduce((s, sale) => s + sale.items.reduce((a, i) => a + i.quantity, 0), 0);
  const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  const totalOutflowUsd = filteredOutflows.reduce((s, o) => {
    const cur = currencies.find(c => c.code === o.currencyCode);
    return s + (cur ? o.amount / cur.rate : o.amount);
  }, 0);

  const lowStock = products.filter(p => p.stock <= p.minStock);

  // Daily chart data
  const dailyData = useMemo(() => {
    const map: Record<string, { revenue: number; profit: number; count: number }> = {};
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      map[d.toISOString().slice(0, 10)] = { revenue: 0, profit: 0, count: 0 };
    }
    filteredSales.forEach(s => {
      const key = s.createdAt.slice(0, 10);
      if (map[key]) {
        map[key].revenue += s.totalUsd;
        map[key].count += 1;
        map[key].profit += s.items.reduce((sum, item) => {
          const p = products.find(x => x.id === item.productId);
          return sum + (item.priceUsd - (p?.costPrice || 0)) * item.quantity;
        }, 0);
      }
    });
    return Object.entries(map).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short' }),
      revenue: displayCurrency ? data.revenue * displayCurrency.rate : data.revenue,
      profit: displayCurrency ? data.profit * displayCurrency.rate : data.profit,
      count: data.count,
    }));
  }, [filteredSales, dateFrom, dateTo, products, displayCurrency]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach(s => s.payments.forEach(p => {
      const label = getMethodLabel(p.method, currencies);
      map[label] = (map[label] || 0) + p.amount;
    }));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSales, currencies]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredSales.forEach(s => s.items.forEach(item => {
      if (!map[item.productId]) map[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
      map[item.productId].qty += item.quantity;
      map[item.productId].revenue += item.totalUsd;
    }));
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredSales]);

  // Employee breakdown
  const employeeBreakdown = useMemo(() => {
    const map: Record<string, { name: string; sales: number; revenue: number }> = {};
    filteredSales.forEach(s => {
      const key = s.employeeId || 'unknown';
      if (!map[key]) map[key] = { name: s.employeeName || 'Sin asignar', sales: 0, revenue: 0 };
      map[key].sales += 1;
      map[key].revenue += s.totalUsd;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const stats = [
    { label: 'Ventas Totales', value: formatPrice(totalRevenue), icon: DollarSign, color: 'text-primary' },
    { label: 'Ganancia Neta', value: formatPrice(totalProfit), icon: TrendingUp, color: 'text-primary' },
    { label: 'Transacciones', value: filteredSales.length, icon: ShoppingCart, color: 'text-info' },
    { label: 'Ticket Promedio', value: formatPrice(avgTicket), icon: DollarSign, color: 'text-accent' },
    { label: 'Artículos Vendidos', value: totalItems, icon: Package, color: 'text-muted-foreground' },
    { label: 'Stock Crítico', value: lowStock.length, icon: AlertTriangle, color: 'text-warning' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reportes</h1>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
          <span className="text-sm text-muted-foreground">a</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-44">
            <Users size={14} className="mr-1" />
            <SelectValue placeholder="Empleado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => {
            const today = new Date().toISOString().slice(0, 10);
            setDateFrom(today); setDateTo(today);
          }}>Hoy</Button>
          <Button size="sm" variant="outline" onClick={() => {
            const d = new Date(); d.setDate(d.getDate() - 7);
            setDateFrom(d.toISOString().slice(0, 10)); setDateTo(new Date().toISOString().slice(0, 10));
          }}>7 días</Button>
          <Button size="sm" variant="outline" onClick={() => {
            const d = new Date(); d.setDate(d.getDate() - 30);
            setDateFrom(d.toISOString().slice(0, 10)); setDateTo(new Date().toISOString().slice(0, 10));
          }}>30 días</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="pos-card p-4">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg bg-secondary ${s.color}`}><s.icon size={16} /></div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                <p className="text-lg font-bold truncate">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="stock">Stock Crítico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 pos-card p-6">
              <h2 className="text-lg font-semibold mb-4">Ventas por Día</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="revenue" name="Ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Ganancia" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Methods Pie */}
            <div className="pos-card p-6">
              <h2 className="text-lg font-semibold mb-4">Métodos de Pago</h2>
              {paymentBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={paymentBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {paymentBreakdown.map((p, i) => (
                      <div key={p.name} className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          {p.name}
                        </span>
                        <span className="font-medium">{p.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
              )}
            </div>

            {/* Transactions Chart */}
            <div className="lg:col-span-2 pos-card p-6">
              <h2 className="text-lg font-semibold mb-4">Transacciones por Día</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Transacciones" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Summary */}
            <div className="pos-card p-6">
              <h2 className="text-lg font-semibold mb-4">Resumen</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-2 bg-secondary/50 rounded"><span>Ingresos Brutos</span><span className="font-semibold">{formatPrice(totalRevenue)}</span></div>
                <div className="flex justify-between p-2 bg-secondary/50 rounded"><span>Impuestos</span><span className="font-semibold">{formatPrice(totalTax)}</span></div>
                <div className="flex justify-between p-2 bg-secondary/50 rounded"><span>Ganancia</span><span className="font-semibold text-primary">{formatPrice(totalProfit)}</span></div>
                <div className="flex justify-between p-2 bg-destructive/5 rounded"><span>Salidas de Dinero</span><span className="font-semibold text-destructive">{formatPrice(totalOutflowUsd)}</span></div>
                <div className="flex justify-between p-3 bg-primary/10 rounded-lg font-bold">
                  <span>Neto</span><span>{formatPrice(totalProfit - totalOutflowUsd)}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div className="pos-card p-6">
            <h2 className="text-lg font-semibold mb-4">Top 10 Productos Más Vendidos</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(p.revenue)}</TableCell>
                  </TableRow>
                ))}
                {topProducts.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Sin datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="employees">
          <div className="pos-card p-6">
            <h2 className="text-lg font-semibold mb-4">Rendimiento por Empleado</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeBreakdown.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-right">{e.sales}</TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(e.revenue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatPrice(e.sales > 0 ? e.revenue / e.sales : 0)}</TableCell>
                  </TableRow>
                ))}
                {employeeBreakdown.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Sin datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="stock">
          <div className="pos-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-warning" /> Stock Crítico
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Todo en orden ✅</TableCell></TableRow>
                ) : (
                  lowStock.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.barcode || '—'}</TableCell>
                      <TableCell className="text-right font-bold text-destructive">{p.stock}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{p.minStock}</TableCell>
                      <TableCell>
                        <Badge variant={p.stock === 0 ? 'destructive' : 'secondary'}>
                          {p.stock === 0 ? 'Agotado' : 'Bajo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
