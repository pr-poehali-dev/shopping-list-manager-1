import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  article: string;
  image?: string;
  hint?: string;
  salePrice?: number;
  purchasePrice?: number;
  quantity?: number;
  supplierId?: string;
  dateAdded: Date;
  isCompleted: boolean;
}

interface Supplier {
  id: string;
  name: string;
  totalDebt: number;
  products: Array<{
    productId: string;
    name: string;
    article: string;
    purchasePrice: number;
    quantity: number;
    date: Date;
  }>;
}

const API_URL = 'https://functions.poehali.dev/1ea1449d-3d3d-49d9-b758-12480f736941';

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [completedProducts, setCompletedProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'name'>('date');
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    article: '',
    hint: '',
    quantity: 1,
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, suppliersRes] = await Promise.all([
        fetch(`${API_URL}?action=get_products`),
        fetch(`${API_URL}?action=get_suppliers`)
      ]);
      
      const productsData = await productsRes.json();
      const suppliersData = await suppliersRes.json();
      
      const loadedProducts = productsData.products.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        article: p.article,
        image: p.image_url,
        hint: p.hint,
        salePrice: p.sale_price,
        purchasePrice: p.purchase_price,
        quantity: p.quantity,
        supplierId: p.supplier_id?.toString(),
        dateAdded: new Date(p.date_added),
        isCompleted: p.is_completed
      }));
      
      const loadedSuppliers = suppliersData.suppliers.map((s: any) => ({
        id: s.id.toString(),
        name: s.name,
        totalDebt: s.total_debt,
        products: []
      }));
      
      setProducts(loadedProducts.filter((p: Product) => !p.isCompleted));
      setCompletedProducts(loadedProducts.filter((p: Product) => p.isCompleted));
      setSuppliers(loadedSuppliers);
    } catch (error) {
      toast.error('Ошибка загрузки данных');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.article) {
      toast.error('Укажите название и артикул товара');
      return;
    }
    
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_product',
          name: newProduct.name,
          article: newProduct.article,
          image_url: newProduct.image,
          hint: newProduct.hint,
          sale_price: newProduct.salePrice,
          quantity: newProduct.quantity || 1,
          supplier_id: newProduct.supplierId ? parseInt(newProduct.supplierId) : null
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        await loadData();
        setNewProduct({ name: '', article: '', hint: '', quantity: 1 });
        setImagePreview('');
        toast.success('Товар добавлен');
      }
    } catch (error) {
      toast.error('Ошибка добавления товара');
      console.error(error);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(id),
          purchase_price: updates.purchasePrice,
          quantity: updates.quantity,
          is_completed: updates.isCompleted
        })
      });
      
      setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (error) {
      toast.error('Ошибка обновления');
      console.error(error);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
      setProducts(products.filter(p => p.id !== id));
      toast.success('Товар удален');
    } catch (error) {
      toast.error('Ошибка удаления');
      console.error(error);
    }
  };

  const completeProduct = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    if (!product.purchasePrice || !product.quantity) {
      toast.error('Укажите цену покупки и количество');
      return;
    }
    await updateProduct(id, { isCompleted: true });
    await loadData();
    toast.success('Товар завершен');
  };

  const sendToDatabase = () => {
    const completed = products.filter(p => p.isCompleted);
    if (completed.length === 0) {
      toast.error('Нет готовых товаров для отправки');
      return;
    }
    
    completed.forEach(product => {
      if (product.supplierId && product.purchasePrice && product.quantity) {
        const supplier = suppliers.find(s => s.id === product.supplierId);
        if (supplier) {
          supplier.products.push({
            productId: product.id,
            name: product.name,
            article: product.article,
            purchasePrice: product.purchasePrice,
            quantity: product.quantity,
            date: new Date(),
          });
          supplier.totalDebt += product.purchasePrice * product.quantity;
          setSuppliers([...suppliers]);
        }
      }
    });
    
    setCompletedProducts([...completedProducts, ...completed]);
    setProducts(products.filter(p => !p.isCompleted));
    toast.success(`${completed.length} товаров отправлено в базу`);
  };

  const addSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error('Укажите название контрагента');
      return;
    }
    
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_supplier',
          name: newSupplierName,
          total_debt: 0
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        await loadData();
        setNewSupplierName('');
        toast.success('Контрагент добавлен');
      }
    } catch (error) {
      toast.error('Ошибка добавления контрагента');
      console.error(error);
    }
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(suppliers.filter(s => s.id !== id));
    toast.success('Контрагент удален');
  };

  const resetSupplierDebt = (id: string) => {
    setSuppliers(suppliers.map(s => s.id === id ? { ...s, totalDebt: 0 } : s));
    toast.success('Долг обнулен');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmImage = () => {
    setNewProduct({ ...newProduct, image: imagePreview });
    toast.success('Фото добавлено');
  };

  const cancelImage = () => {
    setImagePreview('');
  };

  const filteredProducts = completedProducts.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.article.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !filterDate || 
      new Date(p.dateAdded).toLocaleDateString() === new Date(filterDate).toLocaleDateString();
    return matchesSearch && matchesDate;
  }).sort((a, b) => {
    if (sortBy === 'date') return b.dateAdded.getTime() - a.dateAdded.getTime();
    if (sortBy === 'price') return (b.purchasePrice || 0) - (a.purchasePrice || 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const totalPurchases = completedProducts.reduce((sum, p) => 
    sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0);
  const totalQuantity = completedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-black border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <img 
              src="https://cdn.poehali.dev/files/c48fea69-8c0f-473f-b693-c87f0be768fc.png" 
              alt="CARFIX" 
              className="h-12 object-contain"
            />
            
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg">
                <Icon name="ShoppingBag" size={16} className="text-primary" />
                <span className="font-semibold text-black">{totalQuantity}</span>
                <span className="text-gray-600">товаров</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                <Icon name="DollarSign" size={16} className="text-black" />
                <span className="font-semibold text-black">{totalPurchases.toFixed(2)}</span>
                <span className="text-gray-600">₽</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="shopping-list" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="shopping-list">Список покупок</TabsTrigger>
            <TabsTrigger value="database">Общая база</TabsTrigger>
            <TabsTrigger value="suppliers">Контрагенты</TabsTrigger>
          </TabsList>

          <TabsContent value="shopping-list" className="space-y-4">
            <Card className="p-3 border-2 border-black">
              <div className="flex items-center gap-2 flex-wrap">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-2 border-black">
                      <Icon name="Camera" size={18} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Фото товара</DialogTitle>
                    </DialogHeader>
                    <Input type="file" accept="image/*" onChange={handleImageUpload} />
                    {imagePreview && (
                      <div className="space-y-2">
                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded" />
                        <div className="flex gap-2">
                          <Button onClick={confirmImage} className="flex-1">
                            <Icon name="Check" size={16} className="mr-2" />
                            Подтвердить
                          </Button>
                          <Button variant="outline" onClick={cancelImage} className="flex-1">
                            <Icon name="X" size={16} className="mr-2" />
                            Отменить
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-2 border-black">
                      <Icon name="Users" size={18} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Выбрать контрагента</DialogTitle>
                    </DialogHeader>
                    <Select 
                      value={newProduct.supplierId} 
                      onValueChange={(value) => setNewProduct({ ...newProduct, supplierId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выбрать контрагента" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-2 border-black">
                      <Icon name="Info" size={18} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Подсказка</DialogTitle>
                    </DialogHeader>
                    <Textarea 
                      placeholder="Где найти товар..."
                      value={newProduct.hint || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, hint: e.target.value })}
                      rows={4}
                    />
                  </DialogContent>
                </Dialog>

                <Input 
                  placeholder="Название товара"
                  value={newProduct.name || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="flex-1 min-w-[150px] h-10 border-2 border-black"
                />
                
                <Input 
                  placeholder="Артикул"
                  value={newProduct.article || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, article: e.target.value })}
                  className="w-28 h-10 border-2 border-black"
                />

                <Input 
                  type="number" 
                  placeholder="Цена продажи"
                  value={newProduct.salePrice || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, salePrice: parseFloat(e.target.value) })}
                  className="w-28 h-10 border-2 border-black"
                />

                <Input 
                  type="number" 
                  placeholder="Кол-во"
                  value={newProduct.quantity || 1}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) })}
                  className="w-20 h-10 border-2 border-black"
                />

                <Button onClick={addProduct} size="sm" className="h-10 bg-primary hover:bg-primary/90">
                  <Icon name="Plus" size={16} />
                </Button>
              </div>
            </Card>

            <div className="space-y-2">
              {products.map((product) => (
                <Card key={product.id} className="p-2 border-2 border-gray-200 hover:border-primary transition-colors">
                  <div className="flex items-center gap-2">
                    {product.image ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <img src={product.image} alt={product.name} className="w-full" />
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <Icon name="ImageOff" size={16} className="text-gray-400" />
                      </div>
                    )}

                    {product.supplierId && (
                      <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <Icon name="Users" size={16} className="text-gray-600" />
                      </div>
                    )}

                    {product.hint && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                            <Icon name="Info" size={16} className="text-gray-600" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Подсказка</DialogTitle>
                          </DialogHeader>
                          <p>{product.hint}</p>
                        </DialogContent>
                      </Dialog>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{product.name}</div>
                      <div className="text-xs text-gray-600">#{product.article}</div>
                    </div>

                    <Input 
                      type="number"
                      placeholder="Цена покупки"
                      value={product.purchasePrice || ''}
                      onChange={(e) => updateProduct(product.id, { purchasePrice: parseFloat(e.target.value) })}
                      className="w-28 h-9 text-sm"
                    />

                    <Input 
                      type="number"
                      value={product.quantity || 1}
                      onChange={(e) => updateProduct(product.id, { quantity: parseInt(e.target.value) })}
                      className="w-16 h-9 text-sm"
                    />

                    <Button 
                      size="sm" 
                      variant={product.isCompleted ? "default" : "outline"}
                      onClick={() => completeProduct(product.id)}
                      className="h-9 w-9 p-0"
                    >
                      <Icon name="Check" size={14} />
                    </Button>

                    <Button variant="ghost" size="sm" onClick={() => deleteProduct(product.id)} className="h-9 w-9 p-0">
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {products.filter(p => p.isCompleted).length > 0 && (
              <Button onClick={sendToDatabase} className="w-full bg-green-600 hover:bg-green-700">
                <Icon name="Database" size={16} className="mr-2" />
                Отправить в базу ({products.filter(p => p.isCompleted).length})
              </Button>
            )}
          </TabsContent>

          <TabsContent value="database" className="space-y-4">
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <Input 
                  placeholder="Поиск по названию или артикулу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">По дате</SelectItem>
                  <SelectItem value="price">По цене</SelectItem>
                  <SelectItem value="name">По названию</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {filteredProducts.reduce((acc, product) => {
                const date = new Date(product.dateAdded).toLocaleDateString();
                if (!acc[date]) acc[date] = [];
                acc[date].push(product);
                return acc;
              }, {} as Record<string, Product[]>).constructor === Object && 
                Object.entries(
                  filteredProducts.reduce((acc, product) => {
                    const date = new Date(product.dateAdded).toLocaleDateString();
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(product);
                    return acc;
                  }, {} as Record<string, Product[]>)
                ).map(([date, products]) => (
                  <div key={date}>
                    <h3 className="font-semibold mb-2 text-gray-700">{date}</h3>
                    <div className="space-y-2">
                      {products.map(product => (
                        <Card key={product.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{product.name}</h4>
                              <p className="text-sm text-gray-600">Артикул: {product.article}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Количество: {product.quantity}</p>
                              <p className="font-semibold text-green-600">
                                {((product.purchasePrice || 0) * (product.quantity || 0)).toFixed(2)} ₽
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Добавить контрагента</h3>
              <div className="flex gap-2">
                <Input 
                  placeholder="Название контрагента"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                />
                <Button onClick={addSupplier}>
                  <Icon name="Plus" size={16} />
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              {suppliers.map(supplier => (
                <Card key={supplier.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{supplier.name}</h3>
                      <p className="text-sm text-gray-600">
                        Товаров: {supplier.products.length} | 
                        Долг: <span className="font-semibold text-red-600">{supplier.totalDebt.toFixed(2)} ₽</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => resetSupplierDebt(supplier.id)}>
                        Обнулить долг
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteSupplier(supplier.id)}>
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </div>

                  {supplier.products.length > 0 && (
                    <div className="space-y-2 mt-3 border-t pt-3">
                      <h4 className="font-semibold text-sm text-gray-700">История покупок:</h4>
                      {supplier.products.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <div>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-gray-600 ml-2">({p.article})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-600">×{p.quantity}</span>
                            <span className="font-semibold ml-2">{(p.purchasePrice * p.quantity).toFixed(2)} ₽</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;