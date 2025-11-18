import { useState } from 'react';
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

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [completedProducts, setCompletedProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'name'>('date');
  const [filterDate, setFilterDate] = useState('');
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    article: '',
    hint: '',
    quantity: 1,
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState('');

  const addProduct = () => {
    if (!newProduct.name || !newProduct.article) {
      toast.error('Укажите название и артикул товара');
      return;
    }
    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name,
      article: newProduct.article,
      image: newProduct.image,
      hint: newProduct.hint,
      quantity: newProduct.quantity || 1,
      supplierId: newProduct.supplierId,
      dateAdded: new Date(),
      isCompleted: false,
    };
    setProducts([...products, product]);
    setNewProduct({ name: '', article: '', hint: '', quantity: 1 });
    setImagePreview('');
    toast.success('Товар добавлен в список');
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    toast.success('Товар удален');
  };

  const completeProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    if (!product.purchasePrice || !product.quantity) {
      toast.error('Укажите цену покупки и количество');
      return;
    }
    updateProduct(id, { isCompleted: true });
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

  const addSupplier = () => {
    if (!newSupplierName.trim()) {
      toast.error('Укажите название контрагента');
      return;
    }
    const supplier: Supplier = {
      id: Date.now().toString(),
      name: newSupplierName,
      totalDebt: 0,
      products: [],
    };
    setSuppliers([...suppliers, supplier]);
    setNewSupplierName('');
    toast.success('Контрагент добавлен');
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Package" className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Учет товаров</h1>
          </div>
          
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
              <Icon name="ShoppingBag" size={16} className="text-primary" />
              <span className="font-semibold text-gray-900">{totalQuantity}</span>
              <span className="text-gray-600">товаров</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
              <Icon name="DollarSign" size={16} className="text-green-600" />
              <span className="font-semibold text-gray-900">{totalPurchases.toFixed(2)}</span>
              <span className="text-gray-600">₽</span>
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
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Добавить товар</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Фото товара</Label>
                    <Input type="file" accept="image/*" onChange={handleImageUpload} />
                    {imagePreview && (
                      <div className="mt-2 space-y-2">
                        <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={confirmImage} className="flex-1">
                            <Icon name="Check" size={16} />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={cancelImage} className="flex-1">
                            <Icon name="X" size={16} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label>Подсказка</Label>
                    <Textarea 
                      placeholder="Где найти товар..."
                      value={newProduct.hint || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, hint: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Название товара</Label>
                    <Input 
                      placeholder="Введите название"
                      value={newProduct.name || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label>Артикул</Label>
                    <Input 
                      placeholder="1234567"
                      value={newProduct.article || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, article: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Контрагент</Label>
                    <Select 
                      value={newProduct.supplierId} 
                      onValueChange={(value) => setNewProduct({ ...newProduct, supplierId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выбрать" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Цена продажи</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00"
                      value={newProduct.salePrice || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, salePrice: parseFloat(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label>Количество</Label>
                    <Input 
                      type="number" 
                      placeholder="1"
                      value={newProduct.quantity || 1}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <Button onClick={addProduct} className="w-full">
                  <Icon name="Plus" size={16} className="mr-2" />
                  Добавить товар
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              {products.map((product) => (
                <Card key={product.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {product.image ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-16 w-16 p-0">
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <img src={product.image} alt={product.name} className="w-full" />
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center">
                        <Icon name="ImageOff" size={24} className="text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{product.name}</h4>
                          <p className="text-sm text-gray-600">Артикул: {product.article}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => deleteProduct(product.id)}>
                            <Icon name="X" size={16} />
                          </Button>
                        </div>
                      </div>

                      {product.hint && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Icon name="Info" size={14} className="mr-1" />
                              Подсказка
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Где найти товар</DialogTitle>
                            </DialogHeader>
                            <p>{product.hint}</p>
                          </DialogContent>
                        </Dialog>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Цена покупки</Label>
                          <div className="flex gap-1">
                            <Input 
                              type="number"
                              placeholder="0.00"
                              value={product.purchasePrice || ''}
                              onChange={(e) => updateProduct(product.id, { purchasePrice: parseFloat(e.target.value) })}
                              className="h-9"
                            />
                            <Button 
                              size="sm" 
                              variant={product.purchasePrice ? "default" : "outline"}
                              onClick={() => completeProduct(product.id)}
                              className="h-9 px-2"
                            >
                              <Icon name="Check" size={14} />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Количество</Label>
                          <Input 
                            type="number"
                            value={product.quantity || 1}
                            onChange={(e) => updateProduct(product.id, { quantity: parseInt(e.target.value) })}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
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
