"use client";
import { SiSamsung, SiDell, SiHp, SiApple, SiLenovo, SiAsus, SiAcer, SiLogitech, SiCorsair, SiKingstontechnology } from "react-icons/si";
import { toast } from "react-toastify";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, MoreHorizontal, Package, TrendingDown, Layers, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const handleDeleteProduct = (id: string) => setDeleteConfirmId(id);
  const supabase = createClient();
  const router = useRouter();

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
    name: "", brand: "", customBrand: "", modelNumber: "", category: "", purchasePrice: "", sellingPrice: "", currentStock: "0", minStock: "5", warrantyMonths: "12"
  });

  const resetForm = () => {
    setFormData({ name: "", brand: "", customBrand: "", modelNumber: "", category: "", purchasePrice: "", sellingPrice: "", currentStock: "0", minStock: "5", warrantyMonths: "12" });
    setEditingProduct(null);
  };

  const handleEditClick = (product: any) => {
    setEditingProduct(product);
    const predefinedBrands = ["Samsung", "Dell", "HP", "Apple", "Lenovo", "ASUS", "Acer", "Logitech", "Corsair", "Kingston"];
    const isPredefined = predefinedBrands.includes(product.brand);
    setFormData({
      name: product.name,
      brand: isPredefined ? product.brand : "Other",
      customBrand: isPredefined ? "" : product.brand,
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

  const executeDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error("Error deleting product: " + error.message);
      return;
    }
    setProducts(products.filter(p => p.id !== id));
    toast.success("Product deleted successfully!");
    router.refresh();
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.warning("Product name is required.");

    const finalBrand = formData.brand === 'Other' ? formData.customBrand : formData.brand;

    const dbProduct = {
      sku: formData.modelNumber,
      name: formData.name,
      category: formData.category,
      brand: finalBrand,
      purchase_price: parseFloat(formData.purchasePrice) || 0,
      selling_price: parseFloat(formData.sellingPrice) || 0,
      current_stock: parseInt(formData.currentStock) || 0,
      min_stock: parseInt(formData.minStock) || 0,
      shelf_life_days: parseInt(formData.warrantyMonths) || 0,
      status: parseInt(formData.currentStock) > parseInt(formData.minStock) ? "In Stock" : (parseInt(formData.currentStock) <= 0 ? "Out of Stock" : "Low Stock")
    };

    if (editingProduct) {
      const { error } = await supabase.from('products').update(dbProduct).eq('id', editingProduct.id);
      
      if (error) {
        toast.error("Error updating product: " + error.message);
        return;
      }
      
      setProducts(products.map(p => 
        p.id === editingProduct.id 
          ? {
              ...p,
              name: formData.name,
              modelNumber: formData.modelNumber,
              category: formData.category,
              brand: finalBrand,
              purchasePrice: parseFloat(formData.purchasePrice) || 0,
              sellingPrice: parseFloat(formData.sellingPrice) || 0,
              currentStock: parseInt(formData.currentStock) || 0,
              minStock: parseInt(formData.minStock) || 0,
              warrantyMonths: parseInt(formData.warrantyMonths) || 0,
              status: dbProduct.status
            } 
          : p
      ));
      toast.success("Product updated successfully!");
    router.refresh();
    } else {
      const newId = `P${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const newDbProduct = { ...dbProduct, id: newId };

      const { error } = await supabase.from('products').insert([newDbProduct]);
      
      if (error) {
        toast.error("Error adding product: " + error.message);
        return;
      }

      const newProduct = {
        id: newId,
        name: formData.name,
        modelNumber: formData.modelNumber,
        category: formData.category,
        brand: finalBrand,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        currentStock: parseInt(formData.currentStock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        warrantyMonths: parseInt(formData.warrantyMonths) || 0,
        status: dbProduct.status
      };
      
      setProducts([newProduct, ...products]);
      toast.success("Product added successfully!");
    router.refresh();
    }
    
    setIsAddOpen(false);
    resetForm();
  };

  const filteredProducts = products.filter(product => {
    const searchMatch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (product.modelNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const statusMatch = statusFilter === "All" || product.status === statusFilter;
    const categoryMatch = categoryFilter === "All" || product.category === categoryFilter;

    return searchMatch && statusMatch && categoryMatch;
  });

  const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

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
          <p className="text-muted-foreground">Manage your store's product catalog and pricing.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] bg-white border-indigo-100">
                <Filter className="mr-2 h-4 w-4 text-indigo-500" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat as string} value={cat as string}>{cat as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-white border-indigo-100">
                <Filter className="mr-2 h-4 w-4 text-indigo-500" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="In Stock">In Stock</SelectItem>
                <SelectItem value="Low Stock">Low Stock</SelectItem>
                <SelectItem value="Out of Stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl overflow-y-auto max-h-[90vh] bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl">
              <form onSubmit={handleSaveProduct}>
                <DialogHeader className="border-b border-indigo-50/50 pb-4 mb-4">
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    {editingProduct ? "Edit Product Details" : "Add New Product"}
                  </DialogTitle>
                  <DialogDescription className="text-indigo-600/70">
                    {editingProduct ? "Update the details of the selected product." : "Enter the details of the new product to add it to your catalog."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={(val) => val && setFormData({...formData, category: val})} required>
                        <SelectTrigger className="w-full">
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

                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Select value={formData.brand} onValueChange={(val) => val && setFormData({...formData, brand: val})} required>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Samsung"><div className="flex items-center gap-2"><SiSamsung className="w-4 h-4 text-[#1428A0]" /> Samsung</div></SelectItem>
                          <SelectItem value="Dell"><div className="flex items-center gap-2"><SiDell className="w-4 h-4 text-[#0076CE]" /> Dell</div></SelectItem>
                          <SelectItem value="HP"><div className="flex items-center gap-2"><SiHp className="w-4 h-4 text-[#0096D6]" /> HP</div></SelectItem>
                          <SelectItem value="Apple"><div className="flex items-center gap-2"><SiApple className="w-4 h-4 text-slate-800" /> Apple</div></SelectItem>
                          <SelectItem value="Lenovo"><div className="flex items-center gap-2"><SiLenovo className="w-4 h-4 text-[#E2231A]" /> Lenovo</div></SelectItem>
                          <SelectItem value="ASUS"><div className="flex items-center gap-2"><SiAsus className="w-4 h-4 text-[#00539B]" /> ASUS</div></SelectItem>
                          <SelectItem value="Acer"><div className="flex items-center gap-2"><SiAcer className="w-4 h-4 text-[#83B81A]" /> Acer</div></SelectItem>
                          <SelectItem value="Logitech"><div className="flex items-center gap-2"><SiLogitech className="w-4 h-4 text-[#00B8FC]" /> Logitech</div></SelectItem>
                          <SelectItem value="Corsair"><div className="flex items-center gap-2"><SiCorsair className="w-4 h-4 text-[#E6C627]" /> Corsair</div></SelectItem>
                          <SelectItem value="Kingston"><div className="flex items-center gap-2"><SiKingstontechnology className="w-4 h-4 text-[#FF0000]" /> Kingston</div></SelectItem>
                          <SelectItem value="Other"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-slate-200" /> Other</div></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.brand === "Other" && (
                    <div className="space-y-2">
                      <Label>Brand Name</Label>
                      <Input placeholder="Enter brand name" value={formData.customBrand} onChange={(e) => setFormData({...formData, customBrand: e.target.value})} required />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Product Name</Label>
                    <Input placeholder="e.g. Samsung 980 PRO NVMe M.2" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Model Number</Label>
                    <Input placeholder="e.g. MZ-V8P1T0B/AM" value={formData.modelNumber} onChange={(e) => setFormData({...formData, modelNumber: e.target.value})} required />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Price</Label>
                      <Input type="number" placeholder="0.00" value={formData.purchasePrice} onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Price</Label>
                      <Input type="number" placeholder="0.00" value={formData.sellingPrice} onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  
                  <div className="mt-6 border-t border-indigo-50/50 pt-4">
                    <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md transition-all duration-200">
                      {editingProduct ? "Update" : "Save"} Product
                    </Button>
                  </div>
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
                      <TooltipProvider delay={200}>
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <DialogTrigger render={
                              <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50" />} />
                            }>
                              <Eye className="h-4 w-4" />
                            </DialogTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50" onClick={() => handleEditClick(product)} />}>
                              <Edit className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>Edit Product</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50" onClick={() => handleDeleteProduct(product.id)} />}>
                              <Trash2 className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>Delete Product</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                      
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
    
      <ConfirmModal 
        isOpen={!!deleteConfirmId} 
        onClose={() => setDeleteConfirmId(null)} 
        onConfirm={() => deleteConfirmId && executeDelete(deleteConfirmId)} 
        title="Confirm Deletion" 
        description="Are you sure you want to delete this product? This action cannot be undone." 
      />
    </div>
  );
}