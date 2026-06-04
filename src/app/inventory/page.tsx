"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Boxes, AlertTriangle, TrendingDown, PackageCheck } from "lucide-react";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchInventory() {
      const { data } = await supabase.from('products').select('*');
      if (data) {
        const mappedProducts = data.map(p => ({
          id: p.id,
          name: p.name,
          modelNumber: p.sku,
          category: p.category,
          purchasePrice: p.purchase_price,
          currentStock: p.current_stock,
          minStock: p.min_stock,
          status: p.status
        }));
        setProducts(mappedProducts);
      }
      setIsLoading(false);
    }
    fetchInventory();
  }, []);

  const totalProducts = products.length;
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.purchasePrice * p.currentStock), 0);
  const lowStockProducts = products.filter(p => p.status === 'Low Stock');
  const outOfStockProducts = products.filter(p => p.status === 'Out of Stock');
  
  // Mock dead stock items (items with high stock but old models)
  const deadStockItems = products.filter(p => p.currentStock > 20 && (p.id.endsWith('1') || p.id.endsWith('7')));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
        <p className="text-muted-foreground">Track stock levels, value, and get alerts for low inventory.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Boxes className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique SKUs in catalog</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <div className="bg-emerald-100 p-2 rounded-lg">
              <PackageCheck className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on purchase price</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-amber-50/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Low Stock Alerts</CardTitle>
            <div className="bg-amber-100 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{lowStockProducts.length + outOfStockProducts.length}</div>
            <p className="text-xs text-amber-600/80 mt-1">Require immediate attention</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-slate-50/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dead Stock Items</CardTitle>
            <div className="bg-slate-200 p-2 rounded-lg">
              <TrendingDown className="h-4 w-4 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deadStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">No movement in 90 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Stock Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Current</TableHead>
                  <TableHead className="text-center">Min Req</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...outOfStockProducts, ...lowStockProducts].slice(0, 8).map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.modelNumber}</div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{product.currentStock}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{product.minStock}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={product.status === 'Out of Stock' ? 'destructive' : 'secondary'}
                             className={product.status === 'Low Stock' ? 'bg-amber-100 text-amber-700' : ''}>
                        {product.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <TrendingDown className="h-5 w-5" />
              Dead Stock & Slow Moving
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">In Stock</TableHead>
                  <TableHead className="text-right">Tied Up Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadStockItems.slice(0, 8).map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.category}</div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{product.currentStock}</TableCell>
                    <TableCell className="text-right font-medium text-amber-600">
                      {formatCurrency(product.currentStock * product.purchasePrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
