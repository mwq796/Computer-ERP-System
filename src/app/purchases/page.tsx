"use client";
import { toast } from "react-toastify";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { recordPurchaseJournal, deleteJournal, recordPurchaseReturnJournal } from "../accounting-actions";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Filter, ShoppingBag, Truck, DollarSign, MoreHorizontal, Search, Users, Package, Eye, Edit, CheckCircle, Trash2, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState("");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<string>('Paid');
  const [newStatusAmount, setNewStatusAmount] = useState<number | string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const handleDeletePurchase = (id: string) => {
    const purchase = purchases.find(p => p.id === id);
    if (purchase && purchase.items) {
      setReturnItems(purchase.items.map((item: any) => ({
        id: item.id,
        productId: item.productId || item.product_id, 
        productName: item.productName || item.products?.name,
        unitCost: item.unitCost || item.unit_price || 0, 
        quantity: item.quantity, 
        maxQuantity: item.quantity
      })));
      setReturnReason("");
      setDeleteConfirmId(id);
    }
  };
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const [purchasesRes, productsRes, suppliersRes] = await Promise.all([
        supabase.from('purchases').select('*, suppliers(name), purchase_items(*, products(name))').order('date', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('suppliers').select('*')
      ]);
      
      if (purchasesRes.data) setPurchases(purchasesRes.data.map(p => {
        let pStatus = p.payment_status;
        let pAmount = 0;
        if (pStatus === 'Paid') {
          pAmount = p.total_amount;
        }
        
        return {
          id: p.id,
          supplierName: p.suppliers?.name || 'Unknown Supplier',
          date: p.date,
          totalAmount: p.total_amount,
          paidAmount: pAmount,
          paymentStatus: pStatus,
          discount: p.discount,
          subtotal: p.subtotal,
          items: p.purchase_items?.map((item: any) => ({
            productId: item.product_id,
            productName: item.products?.name || 'Unknown Product',
            quantity: item.quantity,
            unitCost: item.unit_cost,
            amount: item.total
          })) || []
        };
      }));
      if (productsRes.data) setProducts(productsRes.data.map(p => ({
        id: p.id,
        name: p.name,
        sellingPrice: p.selling_price,
        purchasePrice: p.purchase_price,
        stock: p.current_stock || 0,
        minStock: p.min_stock || 0
      })));
      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      
      setIsLoading(false);
    }
    loadData();
  }, []);

  const executeDelete = async (id: string) => {

    const purchase = purchases.find(p => p.id === id);
    
    const refundAmount = returnItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    if (purchase && purchase.supplierName && purchase.supplierName !== 'Unknown Supplier') {
      const supplier = suppliers.find(s => s.name === purchase.supplierName);
      if (supplier) {
        const newBalance = (supplier.balance || 0) - refundAmount;
        // We do not decrease total_orders because total_orders represents historical volume, not current outstanding, 
        // but if desired, we could reduce it. Let's just adjust balance.
        await supabase.from('suppliers').update({ balance: newBalance }).eq('id', supplier.id);
        setSuppliers(suppliers.map(s => s.id === supplier.id ? { ...s, balance: newBalance } : s));
      }
    }


    const { data: oldItems } = await supabase.from('purchase_items').select('*').eq('purchase_id', id);
    if (oldItems) {
      for (const item of oldItems) {
        if (!item.product_id) continue;
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          product.stock -= item.quantity;
          const newStatus = Number(product.stock) > Number(product.minStock) ? "In Stock" : (Number(product.stock) <= 0 ? "Out of Stock" : "Low Stock");
          await supabase.from('products').update({ current_stock: product.stock, status: newStatus }).eq('id', product.id);
        }
      }
      setProducts([...products]);
    }

    const { error } = await supabase.from('purchases').update({ payment_status: 'Returned' }).eq('id', id);
    if (error) {
      toast.error("Error deleting purchase: " + error.message);
      return;
    }
    
    const supplierId = purchase ? suppliers.find(s => s.name === purchase.supplierName)?.id || null : null;
    await recordPurchaseReturnJournal(id, refundAmount, supplierId);

    setPurchases(purchases.map(p => p.id === id ? { ...p, paymentStatus: 'Returned' } : p));
    toast.success("Purchase returned successfully");
    router.refresh();
  };

  const handleEditPurchaseStatus = (id: string, currentStatus: string) => {
    setStatusUpdateId(id);
    let baseStatus = currentStatus === 'Paid' ? 'Paid' : 'Unpaid';
    setNewStatusValue(baseStatus);
    setNewStatusAmount('');
  };

  const submitStatusUpdate = async () => {
    if (!statusUpdateId) return;
    let finalStatus = newStatusValue;

    const purchase = purchases.find(p => p.id === statusUpdateId);
    if (!purchase) return;

    const oldStatus = purchase.paymentStatus;
    if (oldStatus === finalStatus) {
      setStatusUpdateId(null);
      return;
    }

    const { error } = await supabase.from('purchases').update({ payment_status: finalStatus }).eq('id', statusUpdateId);
    if (error) {
      toast.error("Error updating status: " + error.message);
      return;
    }

    if (purchase.supplierName && purchase.supplierName !== 'Unknown Supplier') {
      const supplier = suppliers.find(s => s.name === purchase.supplierName);
      if (supplier) {
        let newBalance = supplier.balance || 0;
        if (oldStatus === 'Unpaid' && finalStatus === 'Paid') {
          newBalance -= purchase.totalAmount;
        } else if (oldStatus === 'Paid' && finalStatus === 'Unpaid') {
          newBalance += purchase.totalAmount;
        }
        
        await supabase.from('suppliers').update({ balance: newBalance }).eq('id', supplier.id);
        setSuppliers(suppliers.map(s => s.id === supplier.id ? { ...s, balance: newBalance } : s));
      }
    }

    await recordPurchaseJournal(statusUpdateId);
    const newPaidAmount = finalStatus === 'Paid' ? purchase.totalAmount : 0;
    setPurchases(purchases.map(item => item.id === statusUpdateId ? { ...item, paymentStatus: finalStatus, paidAmount: newPaidAmount } : item));
    setStatusUpdateId(null);
    toast.success("Payment status updated");
    router.refresh();
  };
  
  
  const handleExportCSV = () => {
    const headers = ['Purchase ID', 'Date', 'Supplier', 'Amount', 'Status'];
    const csvContent = [
      headers.join(','),
      ...purchases.map(p => 
        [p.id, p.date, p.supplierName, p.totalAmount, p.paymentStatus].map(v => '"' + v + '"').join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `purchases_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF();
        doc.text("Purchases Report", 14, 15);
        
        const tableColumn = ["Purchase ID", "Date", "Supplier", "Amount", "Status"];
        const tableRows = purchases.map(p => [
          p.id,
          new Date(p.date).toLocaleDateString(),
          p.supplierName,
          p.totalAmount.toString(),
          p.paymentStatus
        ]);

        (doc as any).autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 20,
        });

        doc.save(`purchases_export_${new Date().toISOString().split('T')[0]}.pdf`);
      });
    });
  };

  const handleProductSelect = (val: string) => {
    setSelectedProduct(val);
    const product = products.find(p => p.id === val);
    if (product) {
      setUnitCost((product.purchasePrice || 0).toString());
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !unitCost) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    
    const cost = parseFloat(unitCost);
    setCartItems([...cartItems, {
      product,
      quantity,
      unitCost: cost,
      amount: cost * quantity
    }]);
    
    setSelectedProduct("");
    setQuantity(1);
    setUnitCost("");
  };

  const handleEditPurchase = (purchase: any) => {
    setEditingId(purchase.id);
    setReferenceNumber(purchase.id);
    const supplier = suppliers.find(s => s.name === purchase.supplierName);
    setSelectedSupplier(supplier?.id || "");
    setPaymentStatus(purchase.paymentStatus);
    setDiscount(purchase.discount || 0);
    setPaidAmount(purchase.paidAmount || 0);
    
    setCartItems(purchase.items.map((item: any) => ({
      product: { 
        id: products.find(p => p.name === item.productName)?.id || '', 
        name: item.productName 
      },
      quantity: item.quantity,
      unitCost: item.unitCost,
      amount: item.amount
    })));
    
    setIsAddOpen(true);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };
  
  const subtotal = cartItems.reduce((sum, item) => sum + item.amount, 0);
  const totalAmount = subtotal - discount;

  const handleCreatePurchase = async () => {
    if (cartItems.length === 0) {
      alert("Please add items to the purchase order first.");
      return;
    }
    if (!selectedSupplier) {
      alert("Please select a supplier.");
      return;
    }

    let finalPaidAmount = paidAmount;
    if (paymentStatus === 'Paid') finalPaidAmount = totalAmount;
    if (paymentStatus === 'Unpaid') finalPaidAmount = 0;

    let finalStatus = paymentStatus;
    

    const date = new Date().toISOString();

    const dbPurchase: any = {
      supplier_id: selectedSupplier,
      subtotal: subtotal,
      discount: discount,
      total_amount: totalAmount,
      payment_status: finalStatus
    };

    let activePurchaseId = editingId;
    const remainingBalance = totalAmount - finalPaidAmount;

    if (editingId) {
      const oldPurchase = purchases.find(p => p.id === editingId);
      const oldRemaining = oldPurchase ? (oldPurchase.totalAmount - (oldPurchase.paidAmount || 0)) : 0;

      const { error: purchaseError } = await supabase.from('purchases').update(dbPurchase).eq('id', editingId);
      if (purchaseError) return alert("Error updating purchase order: " + purchaseError.message);

            const supplier = suppliers.find(s => s.id === selectedSupplier);
      if (supplier) {
        const oldPurchaseAmount = oldPurchase ? oldPurchase.totalAmount : 0;
        const newTotalOrders = (supplier.total_orders || 0) - oldPurchaseAmount + totalAmount;
        const newBalance = (supplier.balance || 0) - oldRemaining + remainingBalance;
        await supabase.from('suppliers').update({ balance: newBalance, total_orders: newTotalOrders }).eq('id', selectedSupplier);
        supplier.balance = newBalance;
        supplier.total_orders = newTotalOrders;
      }

      // Reverse previous stock
      const { data: oldItems } = await supabase.from('purchase_items').select('*').eq('purchase_id', editingId);
      if (oldItems) {
        for (const item of oldItems) {
          if (!item.product_id) continue;
          const product = products.find(p => p.id === item.product_id);
          if (product) {
            product.stock -= item.quantity;
          const newStatus = Number(product.stock) > Number(product.minStock) ? "In Stock" : (Number(product.stock) <= 0 ? "Out of Stock" : "Low Stock");
          await supabase.from('products').update({ current_stock: product.stock, status: newStatus }).eq('id', product.id);
          }
        }
      }

      await supabase.from('purchase_items').delete().eq('purchase_id', editingId);
    } else {
      activePurchaseId = referenceNumber || `PO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      dbPurchase.id = activePurchaseId;
      dbPurchase.date = date;

      const { error: purchaseError } = await supabase.from('purchases').insert([dbPurchase]);
      if (purchaseError) return alert("Error saving purchase order: " + purchaseError.message);

            const supplier = suppliers.find(s => s.id === selectedSupplier);
      if (supplier) {
        const newTotalOrders = (supplier.total_orders || 0) + totalAmount;
        const newBalance = (supplier.balance || 0) + remainingBalance;
        await supabase.from('suppliers').update({ balance: newBalance, total_orders: newTotalOrders }).eq('id', selectedSupplier);
        supplier.balance = newBalance;
        supplier.total_orders = newTotalOrders;
      }
    }

    const purchaseItemsData = cartItems.map(item => ({
      purchase_id: activePurchaseId!,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_cost: item.unitCost,
      total: item.amount
    }));

    await supabase.from('purchase_items').insert(purchaseItemsData);

    // Increase new stock
    for (const item of cartItems) {
      const product = products.find(p => p.id === item.product.id);
      if (product) {
        product.stock = Number(product.stock) + Number(item.quantity);
        const newStatus = Number(product.stock) > Number(product.minStock) ? "In Stock" : (Number(product.stock) <= 0 ? "Out of Stock" : "Low Stock");
        await supabase.from('products').update({ current_stock: product.stock, status: newStatus }).eq('id', product.id);
      }
    }
    setProducts([...products]);

    await recordPurchaseJournal(activePurchaseId!);

    const newPurchaseDisplay = {
      id: activePurchaseId,
      supplierName: suppliers.find(s => s.id === selectedSupplier)?.name || 'Unknown Supplier',
      date: editingId ? purchases.find(p => p.id === editingId)?.date : date,
      subtotal: subtotal,
      discount: discount,
      totalAmount: totalAmount,
      paidAmount: finalPaidAmount,
      paymentStatus: paymentStatus,
      items: cartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitCost: item.unitCost,
        amount: item.amount
      }))
    };

    if (editingId) {
      setPurchases(purchases.map(p => p.id === editingId ? newPurchaseDisplay : p));
    } else {
      setPurchases([newPurchaseDisplay, ...purchases]);
    }
    
    setCartItems([]);
    setSelectedSupplier("");
    setPaymentStatus("Unpaid");
    setDiscount(0);
    setPaidAmount(0);
    setEditingId(null);
    setIsAddOpen(false);
    toast.success("Purchase order saved successfully!");
    router.refresh();
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading purchases...</div>;
  }

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

  const totalSpend = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const unpaidPurchases = purchases.filter(p => p.paymentStatus !== 'Paid');
  const totalPayables = unpaidPurchases.reduce((acc, p) => acc + p.totalAmount, 0);

  const filteredPurchases = purchases.filter(purchase => 
    (purchase.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (purchase.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchases Dashboard</h2>
          <p className="text-muted-foreground">Manage supplier purchases, track spending, and restock inventory.</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>} />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>Export as Excel (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button onClick={() => setEditingId(null)} />}>
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Order
            </DialogTrigger>
            <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Purchase Order" : "Create Purchase Order"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Modify an existing purchase order." : "Record a new purchase from a supplier to restock inventory."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label className="flex items-center text-base"><Users className="h-4 w-4 text-indigo-600 mr-2" /> Supplier</Label>
                  <Select value={selectedSupplier} onValueChange={(val) => val && setSelectedSupplier(val)}>
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Select supplier...">
                        {suppliers.find(s => s.id === selectedSupplier)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Purchase Reference / Bill No.</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter bill or reference number" 
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setReferenceNumber(`PO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`)}
                    >
                      Auto
                    </Button>
                  </div>
                </div>
                
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium text-base flex items-center"><Package className="h-4 w-4 text-indigo-600 mr-2" /> Add Items</h4>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={selectedProduct} onValueChange={(val) => val && handleProductSelect(val)}>
                        <SelectTrigger className="h-11 text-base">
                          <SelectValue placeholder="Select product...">
                            {products.find(p => p.id === selectedProduct)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs text-muted-foreground">Unit Cost (PKR)</Label>
                      <Input type="number" placeholder="0.00" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} min="1" />
                    </div>
                    <div className="flex items-end pb-1">
                      <Button variant="secondary" onClick={handleAddToCart} type="button">Add</Button>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 min-h-[100px] max-h-[200px] overflow-y-auto">
                    {cartItems.length === 0 ? (
                      <p className="text-sm text-center text-slate-500 mt-4">No items added to PO yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {cartItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">{item.product.name}</span>
                              <div className="text-slate-500 text-xs">{item.quantity} x {formatCurrency(item.unitCost)}</div>
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
                    <span>Total Amount</span>
                    <span>{formatCurrency(totalAmount)}</span>
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
                      
                      <SelectItem value="Unpaid">Unpaid / On Credit</SelectItem>
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
                      <span className="font-medium text-orange-600">{formatCurrency(totalAmount - paidAmount)}</span>
                    </div>
                  </div>
                )}
                
                <Button className="w-full" onClick={handleCreatePurchase} type="button">Save Purchase Order</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend (All Time)</CardTitle>
            <div className="bg-indigo-100 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total value of all purchases</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchase Orders</CardTitle>
            <div className="bg-emerald-100 p-2 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchases.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total orders placed</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-red-50/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Pending Payables</CardTitle>
            <div className="bg-red-100 p-2 rounded-lg">
              <Truck className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totalPayables)}</div>
            <p className="text-xs text-red-600/80 mt-1">From {unpaidPurchases.length} unpaid bills</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search by PO ID or supplier..."
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
                <TableHead>Purchase ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead className="text-center">Payment Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-medium text-indigo-600">{purchase.id}</TableCell>
                  <TableCell>{formatDate(purchase.date)}</TableCell>
                  <TableCell className="font-medium">{purchase.supplierName}</TableCell>
                  <TableCell className="text-center text-slate-500">
                    {purchase.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} units
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(purchase.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600 font-medium">
                    { 
                     purchase.paymentStatus === 'Unpaid' ? formatCurrency(purchase.totalAmount) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={purchase.paymentStatus === 'Paid' ? 'default' : 'destructive'} 
                           className={purchase.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 
                                       ''}>
                      {purchase.paymentStatus}
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
                            <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50" onClick={() => handleEditPurchase(purchase)} />}>
                              <Edit className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>Edit Purchase</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50" onClick={() => handleEditPurchaseStatus(purchase.id, purchase.paymentStatus)} />}>
                              <CheckCircle className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>Update Status</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-800 hover:bg-orange-50" onClick={() => handleDeletePurchase(purchase.id)} />}>
                              <Undo2 className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>Return Order</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Purchase Order Details</DialogTitle>
                          <DialogDescription>
                            PO {purchase.id} - {purchase.supplierName}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {purchase.items.map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell>{item.productName}</TableCell>
                                  <TableCell className="text-center">{item.quantity}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <div className="flex justify-between items-center border-t pt-4">
                            <span className="font-medium">Total Billed:</span>
                            <span className="font-bold text-lg">{formatCurrency(purchase.totalAmount)}</span>
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

      {/* Status Update Dialog */}
      <Dialog open={!!statusUpdateId} onOpenChange={(open) => !open && setStatusUpdateId(null)}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-indigo-50/50 pb-4 mb-4">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Update Payment Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={newStatusValue} onValueChange={(val) => val && setNewStatusValue(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid in Full</SelectItem>
                  
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
          </div>
          <DialogFooter className="mt-6 border-t border-indigo-50/50 pt-4">
            <Button variant="outline" onClick={() => setStatusUpdateId(null)}>Cancel</Button>
            <Button onClick={submitStatusUpdate}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-red-100 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-red-50/50 pb-4 mb-4">
            <DialogTitle className="text-xl font-bold text-red-600">Manage Purchase Return</DialogTitle>
            <DialogDescription className="pt-2 text-slate-600">
              Select the quantities to return to the supplier and provide a reason. Stock will be deducted from your inventory.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Cost</TableHead>
                    <TableHead className="text-center">Return Qty</TableHead>
                    <TableHead className="text-right">Refund Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell className="text-center">
                        <Input 
                          type="number" 
                          min="0" 
                          max={item.maxQuantity} 
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), item.maxQuantity);
                            const newItems = [...returnItems];
                            newItems[idx].quantity = val;
                            setReturnItems(newItems);
                          }}
                          className="w-20 mx-auto text-center"
                        />
                        <div className="text-xs text-slate-400 mt-1">Max: {item.maxQuantity}</div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {formatCurrency(item.quantity * item.unitCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end items-center gap-4 py-2 bg-slate-50 px-4 rounded-md border border-slate-100">
              <span className="font-semibold text-slate-600">Total Refund Claim:</span>
              <span className="text-2xl font-black text-red-600">
                {formatCurrency(returnItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0))}
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="purchaseReturnReason" className="font-semibold text-slate-700">Reason for Return <span className="text-red-500">*</span></Label>
              <Input 
                id="purchaseReturnReason"
                placeholder="E.g. Defective batch, wrong items delivered..." 
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 border-t border-red-50/50 pt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => executeDelete(deleteConfirmId!)}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}