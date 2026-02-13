import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { productsDB, salesDB, currenciesDB } from '@/lib/db';
import { formatCurrency } from '@/lib/currency';
import { DollarSign, ShoppingCart, AlertTriangle, TrendingUp } from 'lucide-react';
import type { Product, Sale, Currency } from '@/types';

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    (async () => {
      const [s, p, c] = await Promise.all([salesDB.getAll(), productsDB.getAll(), currenciesDB.getAll()]);
      setSales(s.filter(x => x.status === 'completed'));
      setProducts(p);
      setDisplayCurrency(c.find(x => x.isBase) || c[0] || null);
    })();
  }, []);

  const formatPrice = (usd: number) => displayCurrency ? formatCurrency(usd, displayCurrency) : `$ ${usd.toFixed(2)}`;

  const today = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter(s => s.createdAt.slice(0, 10) === today);
  const todayTotal = todaySales.reduce((s, sale) => s + sale.totalUsd, 0);
  const todayProfit = todaySales.reduce((sum, sale) => {
    return sum + sale.items.reduce((s, item) => {
      const p = products.find(x => x.id === item.productId);
      return s + (item.priceUsd - (p?.costPrice || 0)) * item.quantity;
    }, 0);
  }, 0);

  const lowStock = products.filter(p => p.stock <= p.minStock);

  // Last 7 days chart
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const daySales = sales.filter(s => s.createdAt.slice(0, 10) === dateStr);
    const total = daySales.reduce((s, sale) => s + sale.totalUsd, 0);
    return {
      date: d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' }),
      total: displayCurrency ? total * displayCurrency.rate : total,
    };
  });

  const stats = [
    { label: 'Ventas Hoy', value: formatPrice(todayTotal), icon: DollarSign, color: 'text-primary' },
    { label: 'Ganancia Hoy', value: formatPrice(todayProfit), icon: TrendingUp, color: 'text-primary' },
    { label: 'Transacciones', value: todaySales.length, icon: ShoppingCart, color: 'text-info' },
    { label: 'Stock Crítico', value: lowStock.length, icon: AlertTriangle, color: 'text-warning' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="pos-card p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-secondary ${s.color}`}><s.icon size={20} /></div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 pos-card p-6">
          <h2 className="text-lg font-semibold mb-4">Ventas - Últimos 7 días</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="pos-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-warning" /> Stock Crítico
          </h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Todo en orden ✅</p>
            ) : (
              lowStock.map(p => (
                <div key={p.id} className="flex justify-between items-center p-2 rounded-lg bg-destructive/5">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-sm font-bold text-destructive">{p.stock} uds</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
