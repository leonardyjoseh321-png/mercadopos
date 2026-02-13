import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, ShoppingCart, Pause, Play, Trash2, Plus, Minus, Eye, DollarSign, X } from 'lucide-react';
import { productsDB, categoriesDB, customersDB, salesDB, currenciesDB, settingsDB } from '@/lib/db';
import { formatCurrency, convertToUsd, getMethodLabel } from '@/lib/currency';
import { printReceipt } from '@/lib/print';
import type { Product, Category, Customer, CartItem, Sale, Currency, PaymentEntry, SettingEntry } from '@/types';

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cedulaInput, setCedulaInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceCheckMode, setPriceCheckMode] = useState(false);
  const [priceCheckProduct, setPriceCheckProduct] = useState<Product | null>(null);
  const [parkedSales, setParkedSales] = useState<Sale[]>([]);
  const [showParked, setShowParked] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const scannerRef = useRef<HTMLInputElement>(null);
  const cedulaRef = useRef<HTMLInputElement>(null);

  // Payment state
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [payMethod, setPayMethod] = useState('cash_usd');
  const [payAmount, setPayAmount] = useState('');
  const [changeCurrency, setChangeCurrency] = useState('usd');

  const displayCurrency = currencies.find(c => c.isBase) || currencies[0];
  const taxRate = (settings.taxRate as number) || 16;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [prods, cats, currs, sets, parked] = await Promise.all([
      productsDB.getAll(),
      categoriesDB.getAll(),
      currenciesDB.getAll(),
      settingsDB.getAll(),
      salesDB.getByStatus('parked'),
    ]);
    setProducts(prods);
    setCategories(cats);
    setCurrencies(currs);
    setParkedSales(parked);
    const settingsMap: Record<string, any> = {};
    sets.forEach(s => { settingsMap[s.key] = s.value; });
    setSettings(settingsMap);
  };

  const formatPrice = useCallback((usd: number) => {
    if (displayCurrency) return formatCurrency(usd, displayCurrency);
    return `$ ${usd.toFixed(2)}`;
  }, [displayCurrency]);

  const filteredProducts = products.filter(p => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const barcode = searchQuery.trim();
    if (!barcode) return;

    const product = await productsDB.getByBarcode(barcode);
    if (product) {
      if (priceCheckMode) {
        setPriceCheckProduct(product);
        setSearchQuery('');
        return;
      }
      addToCart(product);
      setSearchQuery('');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty <= 0 ? i : { ...i, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.product.salePrice * i.quantity, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handleCedulaSearch = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const c = await customersDB.getByCedula(cedulaInput.trim());
    if (c) {
      setCustomer(c);
    } else {
      setShowNewCustomer(true);
    }
  };

  const createCustomer = async () => {
    const c: Customer = {
      id: crypto.randomUUID(),
      cedula: cedulaInput.trim(),
      name: newCustomerName,
      phone: newCustomerPhone,
      createdAt: new Date().toISOString(),
    };
    await customersDB.put(c);
    setCustomer(c);
    setShowNewCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  const parkSale = async () => {
    if (!customer || cart.length === 0) return;
    const sale: Sale = {
      id: crypto.randomUUID(),
      customerId: customer.id,
      customerName: customer.name,
      customerCedula: customer.cedula,
      items: cart.map(i => ({
        productId: i.product.id,
        productName: i.product.name,
        barcode: i.product.barcode,
        quantity: i.quantity,
        priceUsd: i.product.salePrice,
        totalUsd: i.product.salePrice * i.quantity,
      })),
      payments: [],
      subtotalUsd: subtotal,
      taxAmount,
      totalUsd: total,
      status: 'parked',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await salesDB.put(sale);
    setCart([]);
    setCustomer(null);
    setCedulaInput('');
    setParkedSales(await salesDB.getByStatus('parked'));
  };

  const resumeSale = async (sale: Sale) => {
    const loadedItems: CartItem[] = [];
    for (const item of sale.items) {
      const p = await productsDB.get(item.productId);
      if (p) loadedItems.push({ product: p, quantity: item.quantity });
    }
    setCart(loadedItems);
    const c = await customersDB.get(sale.customerId);
    if (c) { setCustomer(c); setCedulaInput(c.cedula); }
    await salesDB.delete(sale.id);
    setParkedSales(await salesDB.getByStatus('parked'));
    setShowParked(false);
  };

  // Payment logic
  const totalPaidUsd = payments.reduce((s, p) => s + p.amountUsd, 0);
  const remainingUsd = Math.max(0, total - totalPaidUsd);
  const changeUsd = Math.max(0, totalPaidUsd - total);

  const addPayment = () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;
    const curr = currencies.find(c => c.id === (payMethod.includes('bs') ? 'ves' : 'usd'));
    const rate = curr?.rate || 1;
    const entry: PaymentEntry = {
      id: crypto.randomUUID(),
      method: payMethod as PaymentEntry['method'],
      amount: amt,
      currencyCode: curr?.code || 'USD',
      amountUsd: convertToUsd(amt, rate),
    };
    setPayments(prev => [...prev, entry]);
    setPayAmount('');
  };

  const completeSale = async () => {
    if (remainingUsd > 0.01 || !customer) return;
    const sale: Sale = {
      id: crypto.randomUUID(),
      customerId: customer.id,
      customerName: customer.name,
      customerCedula: customer.cedula,
      items: cart.map(i => ({
        productId: i.product.id,
        productName: i.product.name,
        barcode: i.product.barcode,
        quantity: i.quantity,
        priceUsd: i.product.salePrice,
        totalUsd: i.product.salePrice * i.quantity,
      })),
      payments,
      subtotalUsd: subtotal,
      taxAmount,
      totalUsd: total,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await salesDB.put(sale);

    // Update stock
    for (const item of cart) {
      const p = await productsDB.get(item.product.id);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
        await productsDB.put(p);
      }
    }

    // Print receipt
    printReceipt(sale, currencies, settings);

    // Reset
    setCart([]);
    setCustomer(null);
    setCedulaInput('');
    setPayments([]);
    setShowPayment(false);
    loadData();
  };

  const changeCurrObj = currencies.find(c => c.id === changeCurrency);

  return (
    <div className="flex h-screen">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Scanner Bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              ref={scannerRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleScan}
              placeholder={priceCheckMode ? '🔍 Escanear para consultar precio...' : '🔍 Escanear código de barras o buscar...'}
              className="pl-10 h-12 text-base"
              autoFocus
            />
          </div>
          <Button
            variant={priceCheckMode ? 'default' : 'outline'}
            onClick={() => setPriceCheckMode(!priceCheckMode)}
            className="h-12 gap-2"
          >
            <Eye size={18} />
            Consultar
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            Todos
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => priceCheckMode ? setPriceCheckProduct(p) : addToCart(p)}
                className="pos-card p-4 text-left animate-fade-in"
              >
                <p className="font-medium text-sm text-card-foreground truncate">{p.name}</p>
                <p className="text-primary font-bold mt-1">{formatPrice(p.salePrice)}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                  {p.stock <= p.minStock && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Bajo</Badge>}
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                No hay productos. Agrega productos desde Inventario.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-96 border-l border-border bg-card flex flex-col">
        {/* Customer */}
        <div className="p-4 border-b border-border">
          {customer ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{customer.name}</p>
                <p className="text-xs text-muted-foreground">C.I. {customer.cedula} • {customer.phone}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setCustomer(null); setCedulaInput(''); }}>
                <X size={16} />
              </Button>
            </div>
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground">Cédula del cliente</Label>
              <Input
                ref={cedulaRef}
                value={cedulaInput}
                onChange={e => setCedulaInput(e.target.value)}
                onKeyDown={handleCedulaSearch}
                placeholder="V-12345678 + Enter"
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* Parked Sales */}
        {parkedSales.length > 0 && (
          <button onClick={() => setShowParked(true)} className="px-4 py-2 border-b border-border bg-warning/10 text-xs font-medium text-warning flex items-center gap-2">
            <Pause size={14} />
            {parkedSales.length} venta(s) en espera
          </button>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-10">
              <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
              Carrito vacío
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(item.product.salePrice)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product.id, -1)}>
                    <Minus size={12} />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product.id, 1)}>
                    <Plus size={12} />
                  </Button>
                </div>
                <p className="text-sm font-semibold w-20 text-right">{formatPrice(item.product.salePrice * item.quantity)}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Totals & Actions */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{settings.taxName || 'IVA'} ({taxRate}%)</span><span>{formatPrice(taxAmount)}</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{formatPrice(total)}</span></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={parkSale} disabled={cart.length === 0 || !customer}>
              <Pause size={16} /> Aparcar
            </Button>
            <Button className="flex-1 gap-2" onClick={() => { setPayments([]); setShowPayment(true); }} disabled={cart.length === 0 || !customer}>
              <DollarSign size={16} /> Cobrar
            </Button>
          </div>
        </div>
      </div>

      {/* Price Check Dialog */}
      <Dialog open={!!priceCheckProduct} onOpenChange={() => setPriceCheckProduct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Consulta de Precio</DialogTitle></DialogHeader>
          {priceCheckProduct && (
            <div className="text-center py-4">
              <p className="text-lg font-semibold">{priceCheckProduct.name}</p>
              <p className="text-xs text-muted-foreground mb-4">Código: {priceCheckProduct.barcode}</p>
              <p className="text-4xl font-bold text-primary">{formatPrice(priceCheckProduct.salePrice)}</p>
              <p className="text-sm text-muted-foreground mt-2">Stock: {priceCheckProduct.stock} unidades</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Parked Sales Dialog */}
      <Dialog open={showParked} onOpenChange={setShowParked}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ventas en Espera</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {parkedSales.map(sale => (
              <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-medium">{sale.customerName}</p>
                  <p className="text-xs text-muted-foreground">{sale.items.length} items • {formatPrice(sale.totalUsd)}</p>
                </div>
                <Button size="sm" onClick={() => resumeSale(sale)} className="gap-1">
                  <Play size={14} /> Retomar
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Cédula: <strong>{cedulaInput}</strong></p>
            <div>
              <Label>Nombre</Label>
              <Input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="0412-1234567" />
            </div>
            <Button onClick={createCustomer} disabled={!newCustomerName} className="w-full">Registrar Cliente</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Procesar Pago</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-primary">{formatPrice(total)}</p>
              <p className="text-sm text-muted-foreground">Total a cobrar</p>
            </div>

            {/* Payments List */}
            {payments.length > 0 && (
              <div className="space-y-1">
                {payments.map(p => (
                  <div key={p.id} className="flex justify-between text-sm p-2 bg-secondary/50 rounded">
                    <span>{getMethodLabel(p.method)}</span>
                    <span>{p.currencyCode} {p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {remainingUsd > 0.01 && (
              <div className="p-3 bg-warning/10 rounded-lg text-center">
                <p className="text-sm font-medium">Restante: {formatPrice(remainingUsd)}</p>
              </div>
            )}

            {changeUsd > 0.01 && (
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-sm font-medium">
                  Vuelto: {changeCurrObj ? formatCurrency(changeUsd, changeCurrObj) : formatPrice(changeUsd)}
                </p>
                <div className="flex gap-2 justify-center mt-2">
                  {currencies.map(c => (
                    <Button key={c.id} size="sm" variant={changeCurrency === c.id ? 'default' : 'outline'} onClick={() => setChangeCurrency(c.id)}>
                      {c.code}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Add Payment */}
            {remainingUsd > 0.01 && (
              <div className="flex gap-2">
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_usd">Efectivo $</SelectItem>
                    <SelectItem value="cash_bs">Efectivo Bs</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="mobile_payment">Pago Móvil</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="Monto"
                  onKeyDown={e => e.key === 'Enter' && addPayment()}
                />
                <Button onClick={addPayment}>+</Button>
              </div>
            )}

            <Button className="w-full h-12 text-lg" disabled={remainingUsd > 0.01} onClick={completeSale}>
              ✅ Completar Venta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
