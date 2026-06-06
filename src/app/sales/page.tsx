"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { fetchDashboardData } from "../actions";
import { recordSaleJournal, deleteJournal } from "../accounting-actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Search, Receipt, TrendingUp, DollarSign, Printer, MoreHorizontal, User, Users, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerType, setCustomerType] = useState("walkin");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const [salesRes, productsRes, customersRes, dashboardRes] = await Promise.all([
        supabase.from('sales').select('*, customers(name), sale_items(*, products(name))').order('date', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('customers').select('*'),
        fetchDashboardData()
      ]);
      
      if (salesRes.data) setSales(salesRes.data.map(s => {
        let pStatus = s.payment_status;
        let pAmount = 0;
        if (pStatus?.startsWith('Partial Paid:')) {
          pAmount = parseFloat(pStatus.split(': ')[1]) || 0;
          pStatus = 'Partial Paid';
        } else if (pStatus === 'Paid') {
          pAmount = s.total_amount;
        }
        
        return {
          id: s.id,
          customerName: s.customers?.name || 'Walk-in',
          date: s.date,
          totalAmount: s.total_amount,
          paidAmount: pAmount,
          paymentStatus: pStatus,
          paymentMethod: s.payment_method,
          customerType: 'Retail',
          subtotal: s.subtotal,
          discount: s.discount,
          items: s.sale_items?.map((item: any) => ({
            productName: item.products?.name || 'Unknown Product',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            amount: item.total
          })) || []
        };
      }));
      if (productsRes.data) setProducts(productsRes.data.map(p => ({
        id: p.id,
        name: p.name,
        sellingPrice: p.selling_price
      })));
      if (customersRes.data) setCustomers(customersRes.data);
      
      setDashboardData(dashboardRes.dashboardData);
      setTrends(dashboardRes.trends);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleDeleteSale = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) {
      alert("Error deleting sale: " + error.message);
      return;
    }
    await deleteJournal(id);
    setSales(sales.filter(s => s.id !== id));
  };

  const handleEditSaleStatus = async (id: string, currentStatus: string) => {
    const newStatus = prompt("Enter new status (Paid, Unpaid, Partial Paid):", currentStatus);
    if (!newStatus || newStatus === currentStatus) return;
    
    if (!['Paid', 'Unpaid', 'Partial Paid'].includes(newStatus)) {
      alert("Invalid status. Please use Paid, Unpaid, or Partial Paid.");
      return;
    }
    
    const { error } = await supabase.from('sales').update({ payment_status: newStatus }).eq('id', id);
    if (error) {
      alert("Error updating status: " + error.message);
      return;
    }
    await recordSaleJournal(id);
    setSales(sales.map(s => s.id === id ? { ...s, paymentStatus: newStatus } : s));
  };
  
  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    
    setCartItems([...cartItems, {
      product,
      quantity,
      amount: product.sellingPrice * quantity
    }]);
    
    setSelectedProduct("");
    setQuantity(1);
  };

  const handleEditSale = (sale: any) => {
    setEditingId(sale.id);
    const customer = customers.find(c => c.name === sale.customerName);
    setSelectedCustomer(customer?.id || "");
    setCustomerType(customer ? "registered" : "walkin");
    setPaymentStatus(sale.paymentStatus);
    setPaymentMethod(sale.paymentMethod || "cash");
    setDiscount(sale.discount || 0);
    setPaidAmount(sale.paidAmount || 0);
    
    setCartItems(sale.items.map((item: any) => ({
      product: { 
        id: products.find(p => p.name === item.productName)?.id || '', 
        name: item.productName, 
        sellingPrice: item.unitPrice 
      },
      quantity: item.quantity,
      amount: item.amount
    })));
    
    setIsAddOpen(true);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };
  
  const subtotal = cartItems.reduce((sum, item) => sum + item.amount, 0);
  const total = subtotal - discount;

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      alert("Please add products to the sale first.");
      return;
    }

    let finalPaidAmount = paidAmount;
    if (paymentStatus === 'Paid') finalPaidAmount = total;
    if (paymentStatus === 'Unpaid') finalPaidAmount = 0;

    let finalStatus = paymentStatus;
    if (paymentStatus === 'Partial Paid') {
      finalStatus = `Partial Paid: ${finalPaidAmount}`;
    }

    const date = new Date().toISOString();

    const dbSale: any = {
      customer_id: selectedCustomer || null,
      subtotal: subtotal,
      discount: discount,
      total_amount: total,
      payment_status: finalStatus,
      payment_method: paymentMethod
    };

    let activeSaleId = editingId;
    const remainingBalance = total - finalPaidAmount;

    if (editingId) {
      const oldSale = sales.find(s => s.id === editingId);
      const oldRemaining = oldSale ? (oldSale.totalAmount - (oldSale.paidAmount || 0)) : 0;

      const { error: saleError } = await supabase.from('sales').update(dbSale).eq('id', editingId);
      if (saleError) return alert("Error updating sale: " + saleError.message);

      if (selectedCustomer && remainingBalance !== oldRemaining) {
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
          await supabase.from('customers').update({ balance: (customer.balance || 0) - oldRemaining + remainingBalance }).eq('id', selectedCustomer);
          customer.balance = (customer.balance || 0) - oldRemaining + remainingBalance;
        }
      }

      await supabase.from('sale_items').delete().eq('sale_id', editingId);
    } else {
      activeSaleId = `INV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      dbSale.id = activeSaleId;
      dbSale.date = date;

      const { error: saleError } = await supabase.from('sales').insert([dbSale]);
      if (saleError) return alert("Error saving sale: " + saleError.message);

      if (selectedCustomer && remainingBalance > 0) {
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
          await supabase.from('customers').update({ balance: (customer.balance || 0) + remainingBalance }).eq('id', selectedCustomer);
          customer.balance = (customer.balance || 0) + remainingBalance;
        }
      }
    }

    const saleItemsData = cartItems.map(item => ({
      sale_id: activeSaleId,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.sellingPrice,
      total: item.amount
    }));

    await supabase.from('sale_items').insert(saleItemsData);
    await recordSaleJournal(activeSaleId);

    const newSaleDisplay = {
      id: activeSaleId,
      customerName: selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : 'Walk-in',
      customerType: 'Retail',
      date: editingId ? sales.find(s => s.id === editingId)?.date : date,
      subtotal: subtotal,
      discount: discount,
      totalAmount: total,
      paidAmount: finalPaidAmount,
      paymentStatus: paymentStatus,
      paymentMethod: paymentMethod,
      items: cartItems.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        amount: item.amount
      }))
    };

    if (editingId) {
      setSales(sales.map(s => s.id === editingId ? newSaleDisplay : s));
    } else {
      setSales([newSaleDisplay, ...sales]);
    }

    setCartItems([]);
    setSelectedCustomer("");
    setCustomerType("walkin");
    setPaymentStatus("Paid");
    setPaymentMethod("cash");
    setDiscount(0);
    setPaidAmount(0);
    setEditingId(null);
    setIsAddOpen(false);
  };

  if (isLoading || !dashboardData) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading sales...</div>;
  }

  const filteredSales = sales.filter(sale => 
    (sale.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (sale.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>
          <p className="text-muted-foreground">Manage your sales, create invoices, and track revenue.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button onClick={() => setEditingId(null)} />}>
              <Plus className="mr-2 h-4 w-4" />
              New Sale (POS)
            </DialogTrigger>
            <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Sale" : "New Sale (Point of Sale)"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Modify an existing invoice." : "Create a new invoice for a walk-in or registered customer."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label className="flex items-center text-base"><Users className="h-4 w-4 text-indigo-600 mr-2" /> Customer Type</Label>
                  <Select value={customerType} onValueChange={(val) => {
                    if (!val) return;
                    setCustomerType(val);
                    if (val === "walkin") setSelectedCustomer("");
                  }}>
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walkin">Walk-in Customer</SelectItem>
                      <SelectItem value="registered">Registered Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center text-base"><User className="h-4 w-4 text-indigo-600 mr-2" /> Customer Name</Label>
                  <Select value={selectedCustomer} onValueChange={(val) => {
                    if (!val) return;
                    setSelectedCustomer(val);
                    setCustomerType("registered");
                  }}>
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Select customer (optional)...">
                        {customers.find(c => c.id === selectedCustomer)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium text-base flex items-center"><Package className="h-4 w-4 text-indigo-600 mr-2" /> Add Products</h4>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={selectedProduct} onValueChange={(val) => val && setSelectedProduct(val)}>
                        <SelectTrigger className="h-11 text-base">
                          <SelectValue placeholder="Select product...">
                            {products.find(p => p.id === selectedProduct)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name} - {formatCurrency(p.sellingPrice)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input type="number" className="w-20" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} min="1" />
                    <Button variant="secondary" onClick={handleAddToCart} type="button">Add</Button>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 min-h-[100px] max-h-[200px] overflow-y-auto">
                    {cartItems.length === 0 ? (
                      <p className="text-sm text-center text-slate-500 mt-4">No products added yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {cartItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">{item.product.name}</span>
                              <div className="text-slate-500 text-xs">{item.quantity} x {formatCurrency(item.product.sellingPrice)}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{formatCurrency(item.amount)}</span>
                              <button onClick={() => handleRemoveFromCart(idx)} className="text-red-500 hover:text-red-700 font-bold px-1">×</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-emerald-600">
                    <span>Discount (PKR)</span>
                    <Input 
                      type="number" 
                      className="w-24 h-8 text-right" 
                      value={discount || ''} 
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} 
                      min="0" 
                    />
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={(val) => val && setPaymentStatus(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid in Full</SelectItem>
                      <SelectItem value="Partial Paid">Partial Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(val) => val && setPaymentMethod(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card / POS</SelectItem>
                      <SelectItem value="transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentStatus === "Partial Paid" && (
                  <div className="space-y-2">
                    <Label>Amount Paid (PKR)</Label>
                    <Input 
                      type="number" 
                      value={paidAmount || ''} 
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)} 
                      placeholder="Enter amount paid..." 
                      min="0" 
                    />
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>Remaining Balance:</span>
                      <span className="font-medium text-orange-600">{formatCurrency(total - paidAmount)}</span>
                    </div>
                  </div>
                )}
                
                <Button className="w-full" onClick={handleCompleteSale} type="button">Complete Sale</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
            <div className="bg-indigo-100 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(dashboardData.todaySales)}</div>
            <p className="text-xs text-emerald-600/80 flex items-center mt-1">
              Total revenue for today
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Generated</CardTitle>
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Receipt className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time invoices</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <div className="bg-blue-100 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(sales.reduce((acc, sale) => acc + sale.totalAmount, 0) / (sales.length || 1))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Based on total sales</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-sm border-none">
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search by invoice ID or customer..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium text-indigo-600">{sale.id}</TableCell>
                  <TableCell>{formatDate(sale.date)}</TableCell>
                  <TableCell className="font-medium">{sale.customerName}</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(sale.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600 font-medium">
                    {sale.paymentStatus === 'Partial Paid' ? formatCurrency(sale.totalAmount - sale.paidAmount) : 
                     sale.paymentStatus === 'Unpaid' ? formatCurrency(sale.totalAmount) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={
                      sale.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                      sale.paymentStatus === 'Partial Paid' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                      'bg-red-100 text-red-700 border-red-200'
                    }>
                      {sale.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DialogTrigger render={<DropdownMenuItem />} nativeButton={false}>
                            View Invoice
                          </DialogTrigger>
                          <DropdownMenuItem onClick={() => handleEditSale(sale)}>Edit Sale</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditSaleStatus(sale.id, sale.paymentStatus)}>Update Status</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => handleDeleteSale(sale.id)}>Delete Sale</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Invoice Details</DialogTitle>
                          <DialogDescription>
                            Invoice {sale.id} generated on {formatDate(sale.date)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="bg-white p-6 border rounded-lg shadow-sm mt-4">
                          <div className="flex justify-between items-start mb-8">
                            <div>
                              <h3 className="font-bold text-2xl text-slate-800">INVOICE</h3>
                              <p className="text-slate-500 text-sm mt-1">#{sale.id}</p>
                            </div>
                            <div className="text-right text-sm">
                              <p className="font-bold">TechZone Computer Store</p>
                              <p className="text-slate-500">Rawalpindi, Pakistan</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-end border-b pb-4 mb-6">
                            <div className="text-sm">
                              <p className="text-slate-500 mb-1">Billed To:</p>
                              <p className="font-bold">{sale.customerName}</p>
                              <p className="text-slate-500">{sale.customerType}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={
                                sale.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 
                                sale.paymentStatus === 'Partial Paid' ? 'bg-amber-100 text-amber-700' : 
                                'bg-red-100 text-red-700'
                              }>{sale.paymentStatus}</Badge>
                            </div>
                          </div>
                          
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sale.items.map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell>{item.productName}</TableCell>
                                  <TableCell className="text-center">{item.quantity}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          
                          <div className="flex justify-end mt-6">
                            <div className="w-64 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Subtotal</span>
                                <span>{formatCurrency(sale.subtotal)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Discount</span>
                                <span>-{formatCurrency(sale.discount)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                <span>Total</span>
                                <span>{formatCurrency(sale.totalAmount)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-8 flex justify-end gap-2">
                            <Button variant="outline"><Printer className="h-4 w-4 mr-2"/> Print</Button>
                            <Button><Download className="h-4 w-4 mr-2"/> Download PDF</Button>
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
