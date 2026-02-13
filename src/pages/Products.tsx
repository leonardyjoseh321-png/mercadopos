import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Package, Tag, TrendingUp, TrendingDown, ClipboardCheck } from 'lucide-react';
import { productsDB, categoriesDB, currenciesDB, stockAuditsDB } from '@/lib/db';
import { formatCurrency } from '@/lib/currency';
import type { Product, Category, Currency, StockAudit } from '@/types';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showMassPrice, setShowMassPrice] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [auditProduct, setAuditProduct] = useState<Product | null>(null);
  const [auditQty, setAuditQty] = useState('');
  const [auditExplanation, setAuditExplanation] = useState('');

  // Form
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [catName, setCatName] = useState('');

  // Mass price
  const [massPercent, setMassPercent] = useState('');
  const [massDirection, setMassDirection] = useState<'up' | 'down'>('up');
  const [massCategoryId, setMassCategoryId] = useState('all');

  const displayCurrency = currencies.find(c => c.isBase) || currencies[0];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [p, c, cu] = await Promise.all([productsDB.getAll(), categoriesDB.getAll(), currenciesDB.getAll()]);
    setProducts(p);
    setCategories(c);
    setCurrencies(cu);
  };

  const formatPrice = (usd: number) => displayCurrency ? formatCurrency(usd, displayCurrency) : `$ ${usd.toFixed(2)}`;

  const openForm = (p?: Product) => {
    if (p) {
      setEditing(p);
      setName(p.name); setBarcode(p.barcode); setCostPrice(String(p.costPrice));
      setSalePrice(String(p.salePrice)); setStock(String(p.stock));
      setCategoryId(p.categoryId); setMinStock(String(p.minStock));
    } else {
      setEditing(null);
      setName(''); setBarcode(''); setCostPrice(''); setSalePrice('');
      setStock(''); setCategoryId(''); setMinStock('5');
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

  const startAudit = (p: Product) => {
    setAuditProduct(p);
    setAuditQty('');
    setAuditExplanation('');
    setShowAudit(true);
  };

  const saveAudit = async () => {
    if (!auditProduct) return;
    const actual = parseInt(auditQty);
    const diff = actual - auditProduct.stock;
    const audit: StockAudit = {
      id: crypto.randomUUID(),
      productId: auditProduct.id,
      productName: auditProduct.name,
      systemQty: auditProduct.stock,
      actualQty: actual,
      difference: diff,
      explanation: auditExplanation,
      createdAt: new Date().toISOString(),
    };
    await stockAuditsDB.put(audit);
    auditProduct.stock = actual;
    await productsDB.put(auditProduct);
    setShowAudit(false);
    loadData();
  };

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || '—';

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
          </TabsList>
        </div>

        <TabsContent value="products">
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
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{p.barcode || '—'}</TableCell>
                    <TableCell>{getCatName(p.categoryId)}</TableCell>
                    <TableCell className="text-right">{formatPrice(p.costPrice)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(p.salePrice)}</TableCell>
                    <TableCell className="text-right">
                      {p.stock}
                      {p.stock <= p.minStock && <Badge variant="destructive" className="ml-2 text-[10px]">Bajo</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
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
                {products.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No hay productos aún</TableCell></TableRow>
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
      </Tabs>

      {/* Product Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
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
            <div>
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
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

      {/* Stock Audit */}
      <Dialog open={showAudit} onOpenChange={setShowAudit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Auditoría de Stock</DialogTitle></DialogHeader>
          {auditProduct && (
            <div className="space-y-3">
              <p className="text-sm">Producto: <strong>{auditProduct.name}</strong></p>
              <p className="text-sm text-muted-foreground">Según el sistema hay <strong>{auditProduct.stock}</strong> unidades. ¿Cuántas ves tú?</p>
              <div><Label>Cantidad Real</Label><Input type="number" value={auditQty} onChange={e => setAuditQty(e.target.value)} /></div>
              {auditQty && parseInt(auditQty) !== auditProduct.stock && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-destructive">
                    Diferencia: {parseInt(auditQty) - auditProduct.stock} unidades
                  </p>
                  <Label className="mt-2">Explicación</Label>
                  <Input value={auditExplanation} onChange={e => setAuditExplanation(e.target.value)} placeholder="Motivo de la diferencia" />
                </div>
              )}
              <Button onClick={saveAudit} className="w-full" disabled={!auditQty}>Registrar Auditoría</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
