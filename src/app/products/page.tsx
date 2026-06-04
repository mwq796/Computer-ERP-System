"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, MoreHorizontal, Package, TrendingDown, Layers } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase.from('products').select('*');
      if (data) {
        const mappedProducts = data.map(p => ({
          id: p.id,
          name: p.name,
          modelNumber: p.sku,
          category: p.category,
          brand: p.brand,
          purchasePrice: p.purchase_price,
          sellingPrice: p.selling_price,
          currentStock: p.current_stock,
          minStock: p.min_stock,
          warrantyMonths: p.shelf_life_days,
          status: p.status
        }));
        setProducts(mappedProducts);
      }
      setIsLoading(false);
    }
    fetchProducts();
  }, []);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "", brand: "", modelNumber: "", category: "", purchasePrice: "", sellingPrice: "", currentStock: "0", minStock: "5", warrantyMonths: "12"
  });

  const resetForm = () => {
    setFormData({ name: "", brand: "", modelNumber: "", category: "", purchasePrice: "", sellingPrice: "", currentStock: "0", minStock: "5", warrantyMonths: "12" });
    setEditingProduct(null);
  };

  const handleEditClick = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand,
      modelNumber: product.modelNumber,
      category: product.category,
      purchasePrice: product.purchasePrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      currentStock: product.currentStock.toString(),
      minStock: product.minStock.toString(),
      warrantyMonths: product.warrantyMonths.toString()
    });
    setIsAddOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert("Error deleting product: " + error.message);
      return;
    }
    setProducts(products.filter(p => p.id !== id));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const dbProduct = {
      sku: formData.modelNumber,
      name: formData.name,
      category: formData.category,
      brand: formData.brand,
      purchase_price: parseFloat(formData.purchasePrice) || 0,
      selling_price: parseFloat(formData.sellingPrice) || 0,
      current_stock: parseInt(formData.currentStock) || 0,
      min_stock: parseInt(formData.minStock) || 0,
      shelf_life_days: parseInt(formData.warrantyMonths) || 0,
      status: parseInt(formData.currentStock) > parseInt(formData.minStock) ? "In Stock" : "Low Stock"
    };

    if (editingProduct) {
      const { error } = await supabase.from('products').update(dbProduct).eq('id', editingProduct.id);
      
      if (error) {
        alert("Error updating product: " + error.message);
        return;
      }
      
      setProducts(products.map(p => 
        p.id === editingProduct.id 
          ? {
              ...p,
              name: formData.name,
              modelNumber: formData.modelNumber,
              category: formData.category,
              brand: formData.brand,
              purchasePrice: parseFloat(formData.purchasePrice) || 0,
              sellingPrice: parseFloat(formData.sellingPrice) || 0,
              currentStock: parseInt(formData.currentStock) || 0,
              minStock: parseInt(formData.minStock) || 0,
              warrantyMonths: parseInt(formData.warrantyMonths) || 0,
              status: dbProduct.status
            } 
          : p
      ));
    } else {
      const newId = `P${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const newDbProduct = { ...dbProduct, id: newId };

      const { error } = await supabase.from('products').insert([newDbProduct]);
      
      if (error) {
        alert("Error adding product: " + error.message);
        return;
      }

      const newProduct = {
        id: newId,
        name: formData.name,
        modelNumber: formData.modelNumber,
        category: formData.category,
        brand: formData.brand,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        currentStock: parseInt(formData.currentStock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        warrantyMonths: parseInt(formData.warrantyMonths) || 0,
        status: dbProduct.status
      };
      
      setProducts([newProduct, ...products]);
    }
    
    setIsAddOpen(false);
    resetForm();
  };

  const filteredProducts = products.filter(product => 
    (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (product.modelNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.brand || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalValue = products.reduce((acc, p) => acc + (p.purchasePrice * p.currentStock), 0);
  const lowStockCount = products.filter(p => p.status !== 'In Stock').length;

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products Dashboard</h2>
          <p className="text-muted-foreground">Manage your store&apos;s product catalog and pricing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </DialogTrigger>
            <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleSaveProduct}>
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                  <DialogDescription>
                    {editingProduct ? "Update the details of the selected product." : "Enter the details of the new product to add it to your catalog."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-2">
                    <Label>Product Name</Label>
                    <Input placeholder="e.g. Samsung 980 PRO NVMe M.2" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Input placeholder="e.g. Samsung" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Model Number</Label>
                      <Input placeholder="e.g. MZ-V8P1T0B/AM" value={formData.modelNumber} onChange={(e) => setFormData({...formData, modelNumber: e.target.value})} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(val) => val && setFormData({...formData, category: val})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Processors">Processors</SelectItem>
                        <SelectItem value="Keyboards">Keyboards</SelectItem>
                        <SelectItem value="Monitors">Monitors</SelectItem>
                        <SelectItem value="Graphics Cards">Graphics Cards</SelectItem>
                        <SelectItem value="Mice">Mice</SelectItem>
                        <SelectItem value="Laptops">Laptops</SelectItem>
                        <SelectItem value="HDDs">HDDs</SelectItem>
                        <SelectItem value="SSDs">SSDs</SelectItem>
                        <SelectItem value="RAM">RAM</SelectItem>
                        <SelectItem value="Power Supplies">Power Supplies</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Price</Label>
                      <Input type="number" placeholder="0.00" value={formData.purchasePrice} onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Price</Label>
                      <Input type="number" placeholder="0.00" value={formData.sellingPrice} onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Opening Stock</Label>
                      <Input type="number" value={formData.currentStock} onChange={(e) => setFormData({...formData, currentStock: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Alert</Label>
                      <Input type="number" value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: e.target.value})} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Warranty (Months)</Label>
                    <Input type="number" value={formData.warrantyMonths} onChange={(e) => setFormData({...formData, warrantyMonths: e.target.value})} required />
                  </div>
                  
                  <Button type="submit" className="w-full">{editingProduct ? "Update" : "Save"} Product</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Package className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active SKUs</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Layers className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on purchase cost</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-amber-50/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Low Stock Alerts</CardTitle>
            <div className="bg-amber-100 p-2 rounded-lg">
              <TrendingDown className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{lowStockCount}</div>
            <p className="text-xs text-amber-600/80 mt-1">Products needing restock</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search products by name, model, or brand..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category & Brand</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium text-slate-500">{product.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-slate-500">{product.modelNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{product.category}</span>
                      <span className="text-xs text-slate-500">{product.brand}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">{formatCurrency(product.sellingPrice)}</div>
                    <div className="text-xs text-slate-500">Cost: {formatCurrency(product.purchasePrice)}</div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {product.currentStock}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={
                      product.status === 'In Stock' ? 'default' : 
                      product.status === 'Low Stock' ? 'secondary' : 'destructive'
                    } className={
                      product.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                      product.status === 'Low Stock' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                      ''
                    }>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4 text-slate-500" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DialogTrigger render={<DropdownMenuItem />} nativeButton={false}>
                            View Details
                          </DialogTrigger>
                          <DropdownMenuItem onClick={() => handleEditClick(product)}>
                            Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => handleDeleteProduct(product.id)}>
                            Delete Product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Product Details</DialogTitle>
                          <DialogDescription>
                            {product.name} ({product.modelNumber})
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-slate-500">Brand</p>
                              <p className="font-medium">{product.brand}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Category</p>
                              <p className="font-medium">{product.category}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Selling Price</p>
                              <p className="font-medium text-emerald-600">{formatCurrency(product.sellingPrice)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Purchase Price</p>
                              <p className="font-medium">{formatCurrency(product.purchasePrice)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Current Stock</p>
                              <p className="font-medium">{product.currentStock}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Warranty</p>
                              <p className="font-medium">{product.warrantyMonths} Months</p>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
