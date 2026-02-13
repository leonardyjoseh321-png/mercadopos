import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Tag, TrendingUp, TrendingDown, ClipboardCheck, Search, AlertTriangle, Filter, PackageMinus } from 'lucide-react';
import { productsDB, categoriesDB, currenciesDB, stockAuditsDB, stockAdjustmentsDB } from '@/lib/db';
import { formatCurrency } from '@/lib/currency';
import type { Product, Category, Currency, StockAudit, StockAdjustment, UnitType, AdjustmentReason } from '@/types';
import { ADJUSTMENT_REASONS } from '@/types';

const UNIT_LABELS: Record<UnitType, string> = {
  unidad: 'Unidad',
  kilo: 'Kilogramo',
  litro: 'Litro',
  caja: 'Caja',
  metro: 'Metro',
  gramo: 'Gramo',
  libra: 'Libra',
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showMassPrice, setShowMassPrice] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [auditProduct, setAuditProduct] = useState<Product | null>(null);
  const [auditQty, setAuditQty] = useState('');
  const [auditReason, setAuditReason] = useState<AdjustmentReason>('other');
  const [auditExplanation, setAuditExplanation] = useState('');
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState<AdjustmentReason>('damaged');
  const [adjustExplanation, setAdjustExplanation] = useState('');

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [catName, setCatName] = useState('');
  const [unit, setUnit] = useState<UnitType>('unidad');
  const [unitsPerPackage, setUnitsPerPackage] = useState('');
  const [packageName, setPackageName] = useState('');
  const [hasCustomTax, setHasCustomTax] = useState(false);
  const [customTaxRate, setCustomTaxRate] = useState('');
  const [customTaxName, setCustomTaxName] = useState('');

  // Mass price
  const [massPercent, setMassPercent] = useState('');
  const [massDirection, setMassDirection] = useState<'up' | 'down'>('up');
  const [massCategoryId, setMassCategoryId] = useState('all');

  // Audit module
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('all');
  const [auditBarcodeScan, setAuditBarcodeScan] = useState('');
  const [auditHistory, setAuditHistory] = useState<StockAudit[]>([]);

  const displayCurrency = currencies.find(c => c.isBase) || currencies[0];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [p, c, cu, ah] = await Promise.all([
      productsDB.getAll(), categoriesDB.getAll(), currenciesDB.getAll(), stockAuditsDB.getAll(),
    ]);
    setProducts(p);
    setCategories(c);
    setCurrencies(cu);
    setAuditHistory(ah.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  };

  const formatPrice = (usd: number) => displayCurrency ? formatCurrency(usd, displayCurrency) : `$ ${usd.toFixed(2)}`;

  const filteredProducts = products.filter(p => {
    const matchSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterCategory === 'all' || p.categoryId === filterCategory;
    const matchLowStock = !filterLowStock || p.stock <= p.minStock;
    return matchSearch && matchCat && matchLowStock;
  });

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  const openForm = (p?: Product) => {
    if (p) {
      setEditing(p);
      setName(p.name); setBarcode(p.barcode); setCostPrice(String(p.costPrice));
      setSalePrice(String(p.salePrice)); setStock(String(p.stock));
      setCategoryId(p.categoryId); setMinStock(String(p.minStock));
      setUnit(p.unit || 'unidad');
      setUnitsPerPackage(p.unitsPerPackage ? String(p.unitsPerPackage) : '');
      setPackageName(p.packageName || '');
      setHasCustomTax(p.hasCustomTax || false);
      setCustomTaxRate(p.customTaxRate ? String(p.customTaxRate) : '');
      setCustomTaxName(p.customTaxName || '');
    } else {
      setEditing(null);
      setName(''); setBarcode(''); setCostPrice(''); setSalePrice('');
      setStock(''); setCategoryId(''); setMinStock('5');
      setUnit('unidad'); setUnitsPerPackage(''); setPackageName('');
      setHasCustomTax(false); setCustomTaxRate(''); setCustomTaxName('');
    }
    setShowForm(true);
  };

  const saveProduct = async () => {
    const product: Product = {
      id: editing?.id || crypto.randomUUID(),
      name, barcode,
      costPrice: parseFloat(costPrice) || 0,
      salePrice: parseFloat(salePrice) || 0,
      stock: parseInt(stock) || 0,
      categoryId,
      minStock: parseInt(minStock) || 5,
      unit,
      unitsPerPackage: unitsPerPackage ? parseInt(unitsPerPackage) : undefined,
      packageName: packageName || undefined,
      hasCustomTax,
      customTaxRate: hasCustomTax ? (parseFloat(customTaxRate) || 0) : undefined,
      customTaxName: hasCustomTax ? customTaxName : undefined,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    await productsDB.put(product);
    setShowForm(false);
    loadData();
  };

  const deleteProduct = async (id: string) => {
    await productsDB.delete(id);
    loadData();
  };

  const openCatForm = (c?: Category) => {
    setEditingCat(c || null);
    setCatName(c?.name || '');
    setShowCatForm(true);
  };

  const saveCategory = async () => {
    await categoriesDB.put({ id: editingCat?.id || crypto.randomUUID(), name: catName });
    setShowCatForm(false);
    loadData();
  };

  const deleteCategory = async (id: string) => {
    await categoriesDB.delete(id);
    loadData();
  };

  const applyMassPrice = async () => {
    const pct = parseFloat(massPercent);
    if (!pct) return;
    const factor = massDirection === 'up' ? (1 + pct / 100) : (1 - pct / 100);
    const toUpdate = massCategoryId === 'all' ? products : products.filter(p => p.categoryId === massCategoryId);
    for (const p of toUpdate) {
      p.salePrice = Math.round(p.salePrice * factor * 100) / 100;
      await productsDB.put(p);
    }
    setShowMassPrice(false);
    loadData();
  };

  // Audit
  const startAudit = (p: Product) => {
    setAuditProduct(p);
    setAuditQty('');
    setAuditReason('other');
    setAuditExplanation('');
    setShowAudit(true);
  };

  const handleAuditBarcodeScan = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const bc = auditBarcodeScan.trim();
    if (!bc) return;
    const p = await productsDB.getByBarcode(bc);
    if (p) {
      startAudit(p);
    }
    setAuditBarcodeScan('');
  };

  const saveAudit = async () => {
    if (!auditProduct) return;
    const actual = parseInt(auditQty);
    const diff = actual - auditProduct.stock;
    if (diff !== 0 && !auditReason) return;
    const audit: StockAudit = {
      id: crypto.randomUUID(),
      productId: auditProduct.id,
      productName: auditProduct.name,
      systemQty: auditProduct.stock,
      actualQty: actual,
      difference: diff,
      reason: auditReason,
      explanation: auditExplanation,
      createdAt: new Date().toISOString(),
    };
    await stockAuditsDB.put(audit);
    auditProduct.stock = actual;
    await productsDB.put(auditProduct);
    setShowAudit(false);
    loadData();
  };

  // Stock Adjustment (damage, loss, etc.)
  const openAdjustment = (p: Product) => {
    setAdjustProduct(p);
    setAdjustQty('');
    setAdjustReason('damaged');
    setAdjustExplanation('');
    setShowAdjustment(true);
  };

  const saveAdjustment = async () => {
    if (!adjustProduct || !adjustQty) return;
    const qtyToRemove = parseInt(adjustQty);
    if (qtyToRemove <= 0) return;
    const newStock = Math.max(0, adjustProduct.stock - qtyToRemove);
    const adjustment: StockAdjustment = {
      id: crypto.randomUUID(),
      productId: adjustProduct.id,
      productName: adjustProduct.name,
      previousStock: adjustProduct.stock,
      newStock,
      difference: -qtyToRemove,
      reason: adjustReason,
      explanation: adjustExplanation,
      createdAt: new Date().toISOString(),
    };
    await stockAdjustmentsDB.put(adjustment);
    adjustProduct.stock = newStock;
    await productsDB.put(adjustProduct);
    setShowAdjustment(false);
    loadData();
  };

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || '—';

  const auditFilteredProducts = products.filter(p =>
    auditCategoryFilter === 'all' || p.categoryId === auditCategoryFilter
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Tabs defaultValue="products">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Inventario</h1>
            <p className="text-sm text-muted-foreground">{products.length} productos</p>
          </div>
          <TabsList>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
            <TabsTrigger value="audit">Auditoría</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="products">
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44">
                <Filter size={14} className="mr-1" />
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={filterLowStock ? 'default' : 'outline'}
              onClick={() => setFilterLowStock(!filterLowStock)}
              className="gap-2"
            >
              <AlertTriangle size={14} />
              Bajo Stock {lowStockCount > 0 && <Badge variant="destructive" className="ml-1 text-[10px]">{lowStockCount}</Badge>}
            </Button>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={() => openForm()} className="gap-2"><Plus size={16} /> Nuevo Producto</Button>
            <Button variant="outline" onClick={() => setShowMassPrice(true)} className="gap-2"><TrendingUp size={16} /> Ajuste Masivo</Button>
          </div>

          <div className="pos-card-flat overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.unitsPerPackage && (
                        <span className="text-xs text-muted-foreground block">
                          {p.packageName || 'Caja'}: {p.unitsPerPackage} {UNIT_LABELS[p.unit] || p.unit}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{p.barcode || '—'}</TableCell>
                    <TableCell>{getCatName(p.categoryId)}</TableCell>
                    <TableCell className="text-xs">{UNIT_LABELS[p.unit] || 'Unidad'}</TableCell>
                    <TableCell className="text-right">{formatPrice(p.costPrice)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(p.salePrice)}</TableCell>
                    <TableCell className="text-right">
                      {p.stock}
                      {p.stock <= p.minStock && <Badge variant="destructive" className="ml-2 text-[10px]">Bajo</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.hasCustomTax ? (
                        <Badge variant="outline">{p.customTaxName || 'Tax'} {p.customTaxRate}%</Badge>
                      ) : (
                        <span className="text-muted-foreground">General</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAdjustment(p)} title="Ajuste de stock">
                          <PackageMinus size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startAudit(p)} title="Auditar">
                          <ClipboardCheck size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(p)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No hay productos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <Button onClick={() => openCatForm()} className="gap-2 mb-4"><Plus size={16} /> Nueva Categoría</Button>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map(c => (
              <div key={c.id} className="pos-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-primary" />
                  <span className="font-medium">{c.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCatForm(c)}><Pencil size={12} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(c.id)}><Trash2 size={12} /></Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  value={auditBarcodeScan}
                  onChange={e => setAuditBarcodeScan(e.target.value)}
                  onKeyDown={handleAuditBarcodeScan}
                  placeholder="Escanear código de barras + Enter..."
                  className="pl-9"
                />
              </div>
              <Select value={auditCategoryFilter} onValueChange={setAuditCategoryFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="pos-card-flat overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Stock Sistema</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditFilteredProducts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.barcode || '—'}</TableCell>
                      <TableCell>{getCatName(p.categoryId)}</TableCell>
                      <TableCell className="text-right">{p.stock}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => startAudit(p)} className="gap-1">
                          <ClipboardCheck size={14} /> Auditar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Audit History */}
            {auditHistory.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Historial de Auditorías</h3>
                <div className="pos-card-flat overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Sistema</TableHead>
                        <TableHead className="text-right">Real</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                        <TableHead>Razón</TableHead>
                        <TableHead>Explicación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditHistory.slice(0, 50).map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs">{new Date(a.createdAt).toLocaleString('es')}</TableCell>
                          <TableCell className="font-medium">{a.productName}</TableCell>
                          <TableCell className="text-right">{a.systemQty}</TableCell>
                          <TableCell className="text-right">{a.actualQty}</TableCell>
                          <TableCell className={`text-right font-semibold ${a.difference < 0 ? 'text-destructive' : a.difference > 0 ? 'text-green-600' : ''}`}>
                            {a.difference > 0 ? '+' : ''}{a.difference}
                          </TableCell>
                          <TableCell className="text-xs">{ADJUSTMENT_REASONS[a.reason] || a.reason}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{a.explanation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} Producto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>Código de Barras</Label><Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="EAN/UPC (opcional)" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Precio Costo (USD)</Label><Input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} /></div>
              <div><Label>Precio Venta (USD)</Label><Input type="number" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Stock</Label><Input type="number" value={stock} onChange={e => setStock(e.target.value)} /></div>
              <div><Label>Stock Mínimo</Label><Input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unidad de Medida</Label>
                <Select value={unit} onValueChange={v => setUnit(v as UnitType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(UNIT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Package info */}
            <div className="p-3 border rounded-lg space-y-2">
              <Label className="text-xs text-muted-foreground">Empaque / Presentación (opcional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nombre del empaque</Label><Input value={packageName} onChange={e => setPackageName(e.target.value)} placeholder="Ej: Caja, Bulto, Fardo" /></div>
                <div><Label className="text-xs">Unidades por empaque</Label><Input type="number" value={unitsPerPackage} onChange={e => setUnitsPerPackage(e.target.value)} placeholder="Ej: 24" /></div>
              </div>
            </div>

            {/* Custom Tax */}
            <div className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Impuesto personalizado</Label>
                <Switch checked={hasCustomTax} onCheckedChange={setHasCustomTax} />
              </div>
              {hasCustomTax && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Nombre</Label><Input value={customTaxName} onChange={e => setCustomTaxName(e.target.value)} placeholder="Ej: Exento, IVA Reducido" /></div>
                  <div><Label className="text-xs">Tasa (%)</Label><Input type="number" value={customTaxRate} onChange={e => setCustomTaxRate(e.target.value)} placeholder="0" /></div>
                </div>
              )}
            </div>

            <Button onClick={saveProduct} className="w-full" disabled={!name || !salePrice}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Form */}
      <Dialog open={showCatForm} onOpenChange={setShowCatForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCat ? 'Editar' : 'Nueva'} Categoría</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={catName} onChange={e => setCatName(e.target.value)} /></div>
            <Button onClick={saveCategory} className="w-full" disabled={!catName}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mass Price */}
      <Dialog open={showMassPrice} onOpenChange={setShowMassPrice}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajuste Masivo de Precios</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Categoría</Label>
              <Select value={massCategoryId} onValueChange={setMassCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant={massDirection === 'up' ? 'default' : 'outline'} onClick={() => setMassDirection('up')} className="gap-2">
                <TrendingUp size={16} /> Aumentar
              </Button>
              <Button variant={massDirection === 'down' ? 'default' : 'outline'} onClick={() => setMassDirection('down')} className="gap-2">
                <TrendingDown size={16} /> Disminuir
              </Button>
            </div>
            <div><Label>Porcentaje (%)</Label><Input type="number" value={massPercent} onChange={e => setMassPercent(e.target.value)} /></div>
            <Button onClick={applyMassPrice} className="w-full" disabled={!massPercent}>Aplicar Ajuste</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Audit Dialog */}
      <Dialog open={showAudit} onOpenChange={setShowAudit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Auditoría de Stock</DialogTitle></DialogHeader>
          {auditProduct && (
            <div className="space-y-3">
              <p className="text-sm">Producto: <strong>{auditProduct.name}</strong></p>
              <p className="text-sm text-muted-foreground">Según el sistema hay <strong>{auditProduct.stock}</strong> {UNIT_LABELS[auditProduct.unit] || 'unidades'}. ¿Cuántas ves tú?</p>
              <div><Label>Cantidad Real</Label><Input type="number" value={auditQty} onChange={e => setAuditQty(e.target.value)} /></div>
              {auditQty && parseInt(auditQty) !== auditProduct.stock && (
                <div className="p-3 bg-destructive/10 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Diferencia: {parseInt(auditQty) - auditProduct.stock} {UNIT_LABELS[auditProduct.unit] || 'unidades'}
                  </p>
                  <div>
                    <Label className="text-xs">Razón del Ajuste</Label>
                    <Select value={auditReason} onValueChange={v => setAuditReason(v as AdjustmentReason)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ADJUSTMENT_REASONS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Explicación</Label>
                    <Input value={auditExplanation} onChange={e => setAuditExplanation(e.target.value)} placeholder="Detalle adicional" />
                  </div>
                </div>
              )}
              <Button onClick={saveAudit} className="w-full" disabled={!auditQty || (parseInt(auditQty) !== auditProduct.stock && !auditReason)}>
                Registrar Auditoría
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showAdjustment} onOpenChange={setShowAdjustment}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajuste de Stock</DialogTitle></DialogHeader>
          {adjustProduct && (
            <div className="space-y-3">
              <p className="text-sm">Producto: <strong>{adjustProduct.name}</strong></p>
              <p className="text-sm text-muted-foreground">Stock actual: <strong>{adjustProduct.stock}</strong> {UNIT_LABELS[adjustProduct.unit] || 'unidades'}</p>
              <div>
                <Label>Razón del Ajuste</Label>
                <Select value={adjustReason} onValueChange={v => setAdjustReason(v as AdjustmentReason)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ADJUSTMENT_REASONS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Cantidad a descontar</Label><Input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="Ej: 2" /></div>
              <div><Label>Explicación</Label><Input value={adjustExplanation} onChange={e => setAdjustExplanation(e.target.value)} placeholder="Detalle del ajuste" /></div>
              {adjustQty && (
                <p className="text-sm text-muted-foreground">
                  Stock resultante: <strong>{Math.max(0, adjustProduct.stock - (parseInt(adjustQty) || 0))}</strong>
                </p>
              )}
              <Button onClick={saveAdjustment} className="w-full" disabled={!adjustQty || !adjustReason}>
                Aplicar Ajuste
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
