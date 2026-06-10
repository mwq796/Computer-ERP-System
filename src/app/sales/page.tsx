"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { fetchDashboardData } from "../actions";
import { recordSaleJournal, deleteJournal, recordSaleReturnJournal } from "../accounting-actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Search, Receipt, TrendingUp, DollarSign, Printer, MoreHorizontal, User, Users, Package, Eye, Edit, CheckCircle, Undo2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";

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
  const [quantity, setQuantity] = useState<number | string>('');
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<string>('Paid');
  const [newStatusAmount, setNewStatusAmount] = useState<number | string>('');
  const [saleToReturn, setSaleToReturn] = useState<string | null>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const supabase = createClient();
  const router = useRouter();

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
            productId: item.product_id,
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
        sellingPrice: p.selling_price,
        stock: p.current_stock || 0,
        minStock: p.min_stock || 0
      })));
      if (customersRes.data) setCustomers(customersRes.data);

      setDashboardData(dashboardRes.dashboardData);
      setTrends(dashboardRes.trends);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const confirmReturnSale = async () => {
    if (!saleToReturn) return;
    const id = saleToReturn;

    if (!returnReason.trim()) {
      return toast.warning("Please provide a reason for the return.");
    }

    // Reverse stock and save returned_quantity based on selected return quantities
    for (const item of returnItems) {
      if (!item.productId || item.quantity <= 0) continue;
      
      // Update inventory stock
      const product = products.find(p => p.id === item.productId);
      if (product) {
        product.stock += item.quantity;
        const newStatus = Number(product.stock) > Number(product.minStock) ? "In Stock" : (Number(product.stock) <= 0 ? "Out of Stock" : "Low Stock");
        await supabase.from("products").update({ current_stock: product.stock, status: newStatus }).eq("id", product.id);
      }

      // Update sale_items with returned_quantity
      if (item.id) {
        await supabase.from("sale_items").update({ returned_quantity: item.quantity }).eq("id", item.id);
      }
    }
    setProducts([...products]);

    const { error } = await supabase.from('sales').update({ payment_status: 'Returned', return_reason: returnReason }).eq('id', id);
    if (error) {
      if (error.message.includes('return_reason')) {
         toast.error("Database error: Please run the SQL to add 'return_reason' column to the sales table!");
      } else {
         toast.error("Error returning sale: " + error.message);
      }
      return;
    }
    
    
    const refundAmount = returnItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const sale = sales.find(s => s.id === id);
    if (sale && sale.customerName !== 'Walk-in') {
      const customer = customers.find(c => c.name === sale.customerName);
      if (customer) {
        const newBalance = (customer.balance || 0) - refundAmount;
        await supabase.from('customers').update({ balance: newBalance }).eq('id', customer.id);
      }
    }
    
    // Use the new return journal instead of deleting the original sale completely
    const customerId = sale ? customers.find(c => c.name === sale.customerName)?.id || null : null;
    await recordSaleReturnJournal(id, refundAmount, customerId);

    setSales(sales.map(s => s.id === id ? { ...s, paymentStatus: 'Returned' } : s));
    setSaleToReturn(null);
    toast.success("Sale returned successfully");
    router.refresh();
  };

  const handleReturnSaleClick = (id: string) => {
    const sale = sales.find(s => s.id === id);
    if (sale) {
      setReturnItems(sale.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity, // Set default return to max remaining
        maxQuantity: item.quantity
      })));
      setReturnReason("");
      setSaleToReturn(id);
    }
  };

  const handleEditSaleStatus = (id: string, currentStatus: string) => {
    setStatusUpdateId(id);
    let baseStatus = currentStatus === 'Paid' ? 'Paid' : 'Unpaid';
    setNewStatusValue(baseStatus);
    setNewStatusAmount('');
  };

  const submitStatusUpdate = async () => {
    if (!statusUpdateId) return;
    let finalStatus = newStatusValue;

    const sale = sales.find(s => s.id === statusUpdateId);
    if (!sale) return;

    const oldStatus = sale.paymentStatus;
    if (oldStatus === finalStatus) {
      setStatusUpdateId(null);
      return;
    }

    const { error } = await supabase.from('sales').update({ payment_status: finalStatus }).eq('id', statusUpdateId);
    if (error) {
      toast.error("Error updating status: " + error.message);
      return;
    }

    if (sale.customerName && sale.customerName !== 'Walk-in') {
      const customer = customers.find(c => c.name === sale.customerName);
      if (customer) {
        let newBalance = customer.balance || 0;
        if (oldStatus === 'Unpaid' && finalStatus === 'Paid') {
          newBalance -= sale.totalAmount;
        } else if (oldStatus === 'Paid' && finalStatus === 'Unpaid') {
          newBalance += sale.totalAmount;
        }
        
        await supabase.from('customers').update({ balance: newBalance }).eq('id', customer.id);
        setCustomers(customers.map(c => c.id === customer.id ? { ...c, balance: newBalance } : c));
      }
    }

    await recordSaleJournal(statusUpdateId);
    const newPaidAmount = finalStatus === 'Paid' ? sale.totalAmount : 0;
    setSales(sales.map(item => item.id === statusUpdateId ? { ...item, paymentStatus: finalStatus, paidAmount: newPaidAmount } : item));
    setStatusUpdateId(null);
    toast.success("Payment status updated");
    router.refresh();
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const q = typeof quantity === 'number' ? quantity : (parseInt(quantity as string) || 1);
    if (q < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }

    if (product.stock < q) {
      toast.error(`Cannot add more than available stock (${product.stock}).`);
      return;
    }

    setCartItems([...cartItems, {
      product: { id: product.id, name: product.name, sellingPrice: product.sellingPrice },
      quantity: q,
      amount: product.sellingPrice * q
    }]);

    setSelectedProduct("");
    setQuantity('');
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
  const total = Math.max(0, subtotal - discount);

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      toast.error("Please add products to the sale first.");
      return;
    }
    if (customerType === 'registered' && !selectedCustomer) {
      toast.error("Please select a registered customer.");
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

      // Reverse previous stock
      if (oldSale && oldSale.items) {
        for (const item of oldSale.items) {
          if (!item.productId) continue;
          const product = products.find(p => p.id === item.productId);
          if (product) {
            product.stock += item.quantity;
          const newStatus = Number(product.stock) > Number(product.minStock) ? "In Stock" : (Number(product.stock) <= 0 ? "Out of Stock" : "Low Stock");
          await supabase.from("products").update({ current_stock: product.stock, status: newStatus }).eq("id", product.id);
          }
        }
      }

      const { error: saleError } = await supabase.from('sales').update(dbSale).eq('id', editingId);
      if (saleError) return toast.error("Error updating sale: " + saleError.message);

      if (selectedCustomer) {
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
          const oldSaleAmount = oldSale ? oldSale.totalAmount : 0;
          const newTotalPurchases = (customer.totalPurchases || 0) - oldSaleAmount + total;
          const newBalance = (customer.balance || 0) - oldRemaining + remainingBalance;

          await supabase.from('customers').update({
            balance: newBalance,
            total_purchases: newTotalPurchases
          }).eq('id', selectedCustomer);

          customer.balance = newBalance;
          customer.totalPurchases = newTotalPurchases;
        }
      }

      await supabase.from('sale_items').delete().eq('sale_id', editingId);
    } else {
      activeSaleId = `INV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      dbSale.id = activeSaleId;
      dbSale.date = date;

      const { error: saleError } = await supabase.from('sales').insert([dbSale]);
      if (saleError) return toast.error("Error saving sale: " + saleError.message);

      if (selectedCustomer) {
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
          const newTotalPurchases = (customer.totalPurchases || 0) + total;
          const newBalance = (customer.balance || 0) + remainingBalance;

          await supabase.from('customers').update({
            balance: newBalance,
            total_purchases: newTotalPurchases
          }).eq('id', selectedCustomer);

          customer.balance = newBalance;
          customer.totalPurchases = newTotalPurchases;
        }
      }
    }

    const saleItemsData = cartItems.map(item => ({
      sale_id: activeSaleId!,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.sellingPrice,
      total: item.amount
    }));

    await supabase.from('sale_items').insert(saleItemsData);

    // Deduct new stock
    for (const item of cartItems) {
      const product = products.find(p => p.id === item.product.id);
      if (product) {
        product.stock -= item.quantity;
        const newStatus = Number(product.stock) > Number(product.minStock) ? "In Stock" : (Number(product.stock) <= 0 ? "Out of Stock" : "Low Stock");
        await supabase.from("products").update({ current_stock: product.stock, status: newStatus }).eq("id", product.id);
      }
    }
    setProducts([...products]);

    await recordSaleJournal(activeSaleId!);

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
        productId: item.product.id,
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
    /* removed walkin reset */
    setPaymentStatus("Paid");
    setPaymentMethod("cash");
    setDiscount(0);
    setPaidAmount(0);
    setEditingId(null);
    setIsAddOpen(false);
    toast.success("Sale completed successfully!");
    router.refresh();
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

  const handleExportCSV = () => {
    const headers = ["Sale ID", "Date", "Customer Name", "Total Amount", "Payment Status"];
    const csvContent = [
      headers.join(","),
      ...filteredSales.map(s => `"${s.id}","${formatDate(s.date)}","${s.customerName || 'Walk-in'}",${s.totalAmount},"${s.paymentStatus}"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    const handlePrintInvoice = (sale: any) => {
    const printContent = `
      <html>
        <head>
          <title>Invoice #${sale.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; }
            .subtitle { color: #666; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f8f9fa; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; width: 300px; float: right; }
            .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">INVOICE</div>
              <div class="subtitle">#${sale.id}</div>
            </div>
            <div class="text-right">
              <div class="bold">TechZone Computer Store</div>
              <div class="subtitle">Rawalpindi, Pakistan</div>
            </div>
          </div>
          <div style="margin-bottom: 20px;">
            <div class="subtitle">Billed To:</div>
            <div class="bold">{sale.customerName}</div>
            <div class="subtitle">{sale.customerType}</div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map((item: any) => `
                <tr>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td class="text-right">{formatCurrency(item.unitPrice)}</td>
                  <td class="text-right">{formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            <div class="totals-row">
              <span>Discount</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
            <div class="totals-row bold" style="border-top: 1px solid #ddd; padding-top: 10px;">
              <span>Total</span>
              <span>{formatCurrency(sale.totalAmount)}</span>
            </div>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleDownloadInvoicePDF = (sale: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("INVOICE", 14, 22);
    doc.setFontSize(10);
    doc.text(`#${sale.id}`, 14, 30);
    
    doc.text("TechZone Computer Store", 140, 22);
    doc.setTextColor(100);
    doc.text("Rawalpindi, Pakistan", 140, 28);
    
    doc.setTextColor(0);
    doc.text("Billed To:", 14, 45);
    doc.setFontSize(12);
    doc.text(sale.customerName || 'Walk-in', 14, 52);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(sale.customerType || 'Retail', 14, 58);
    
    doc.setTextColor(0);
    doc.text(`Date: ${formatDate(sale.date)}`, 140, 45);
    doc.text(`Status: ${sale.paymentStatus}`, 140, 52);

    autoTable(doc, {
      startY: 70,
      head: [["Item", "Qty", "Price", "Total"]],
      body: sale.items.map((item: any) => [
        item.productName,
        item.quantity,
        formatCurrency(item.unitPrice),
        formatCurrency(item.amount)
      ]),
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 70;
    
    doc.text("Subtotal:", 140, finalY + 10);
    doc.text(formatCurrency(sale.subtotal), 180, finalY + 10, { align: "right" });
    
    doc.text("Discount:", 140, finalY + 18);
    doc.text(`-{formatCurrency(sale.discount)}`, 180, finalY + 18, { align: "right" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 140, finalY + 28);
    doc.text(formatCurrency(sale.totalAmount), 180, finalY + 28, { align: "right" });

    doc.save(`Invoice_${sale.id}.pdf`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Sales Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Sale ID", "Date", "Customer Name", "Total Amount", "Payment Status"]],
      body: filteredSales.map(s => [
        s.id,
        formatDate(s.date),
        s.customerName || 'Walk-in',
        formatCurrency(s.totalAmount),
        s.paymentStatus
      ]),
    });

    doc.save(`sales_export_${new Date().toISOString().split('T')[0]}.pdf`);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>
          <p className="text-muted-foreground">Manage your sales, create invoices, and track revenue.</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            } />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>Export as Excel (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button onClick={() => setEditingId(null)} />}>
              <Plus className="mr-2 h-4 w-4" />
              New Sale
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl overflow-y-auto max-h-[90vh] bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl">
              <DialogHeader className="border-b border-indigo-50/50 pb-4 mb-4">
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  {editingId ? "Edit Sale Details" : "New Sale"}
                </DialogTitle>
                <DialogDescription className="text-indigo-600/70">
                  {editingId ? "Modify an existing invoice." : "Create a new invoice for a customer."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                

                <div className="space-y-2">
                    <Label className="flex items-center text-base"><User className="h-4 w-4 text-indigo-600 mr-2" /> Customer Name <span className="text-red-500 ml-1">*</span></Label>
                    <Select value={selectedCustomer} onValueChange={(val) => {
                      if (!val) return;
                      setSelectedCustomer(val);
                      setCustomerType("registered");
                    }}>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Select customer...">
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
                  <div className="flex flex-col sm:flex-row gap-2">
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
                    <div className="flex gap-2 items-center">
                      <div className="flex items-center border rounded-md h-10 w-32 bg-white">
                        <button type="button" onClick={() => setQuantity(Math.max(1, (Number(quantity) || 1) - 1))} className="px-3 py-2 text-slate-600 hover:bg-slate-100 border-r rounded-l-md font-bold transition-colors">-</button>
                        <input type="number" className="w-full text-center outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium" value={quantity} onFocus={(e) => e.target.select()} onChange={(e) => { const val = parseInt(e.target.value); setQuantity(isNaN(val) || val <= 0 ? '' : val) }} min="1" />
                        <button type="button" onClick={() => setQuantity((Number(quantity) || 0) + 1)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 border-l rounded-r-md font-bold transition-colors">+</button>
                      </div>
                      <Button variant="secondary" className="h-10" onClick={handleAddToCart} type="button">Add</Button>
                    </div>
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
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
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

                <div className="mt-6 border-t border-indigo-50/50 pt-4">
                  <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md transition-all duration-200" onClick={handleCompleteSale} type="button">
                    Complete Sale
                  </Button>
                </div>
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
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
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
                      <TooltipProvider delay={200}>
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <DialogTrigger render={
                              <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50" />} />
                            }>
                              <Eye className="h-4 w-4" />
                            </DialogTrigger>
                            <TooltipContent>View Invoice</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50" onClick={() => handleEditSale(sale)} />}>
                              <Edit className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>Edit Sale</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50" onClick={() => handleEditSaleStatus(sale.id, sale.paymentStatus)} />}>
                              <CheckCircle className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>Update Status</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-white hover:bg-red-500 transition-colors" onClick={() => handleReturnSaleClick(sale.id)} />}>
                              <Undo2 className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>Return Sale</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                      <DialogContent className="sm:max-w-4xl w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] bg-slate-50/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl overflow-hidden p-0">
                        <DialogHeader className="sr-only">
                          <DialogTitle>Invoice Details</DialogTitle>
                          <DialogDescription>Invoice {sale.id} generated on {formatDate(sale.date)}</DialogDescription>
                        </DialogHeader>
                        
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white relative overflow-hidden">
                          <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="100" cy="100" r="100" fill="currentColor"/>
                            </svg>
                          </div>
                          <div className="flex justify-between items-start relative z-10">
                            <div>
                              <h2 className="text-4xl font-black tracking-tight">INVOICE</h2>
                              <p className="text-indigo-200 mt-1 font-medium tracking-widest text-sm uppercase">#{sale.id}</p>
                            </div>
                            <div className="text-right">
                              <h3 className="font-bold text-xl mb-1">TechZone Computer Store</h3>
                              <p className="text-indigo-100 text-sm opacity-90">Rawalpindi, Pakistan</p>
                              <p className="text-indigo-100 text-sm mt-2 font-medium opacity-90">Date: {formatDate(sale.date)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-8 bg-white">
                          <div className="flex justify-between items-end border-b border-slate-100 pb-6 mb-8">
                            <div>
                              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Billed To</p>
                              <p className="text-xl font-bold text-slate-800">{sale.customerName}</p>
                              <p className="text-sm text-slate-500 font-medium">{sale.customerType}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Payment Status</p>
                              <Badge className={
                                sale.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 px-4 py-1.5 text-sm font-bold shadow-sm' :
                                'bg-red-100 text-red-700 hover:bg-red-200 border-red-200 px-4 py-1.5 text-sm font-bold shadow-sm'
                              }>{sale.paymentStatus}</Badge>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-8">
                            <Table>
                              <TableHeader className="bg-slate-50 border-b border-slate-200">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="text-slate-600 font-bold py-4 uppercase text-xs tracking-wider">Item Description</TableHead>
                                  <TableHead className="text-center text-slate-600 font-bold py-4 uppercase text-xs tracking-wider">Qty</TableHead>
                                  <TableHead className="text-right text-slate-600 font-bold py-4 uppercase text-xs tracking-wider">Unit Price</TableHead>
                                  <TableHead className="text-right text-slate-600 font-bold py-4 uppercase text-xs tracking-wider">Total Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sale.items.map((item: any, idx: number) => (
                                  <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-semibold text-slate-800 py-4">{item.productName}</TableCell>
                                    <TableCell className="text-center text-slate-600 font-medium py-4">
                                      <Badge variant="outline" className="bg-slate-50 font-semibold">{item.quantity}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-slate-600 font-medium py-4">{formatCurrency(item.unitPrice)}</TableCell>
                                    <TableCell className="text-right font-bold text-slate-900 py-4">{formatCurrency(item.amount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="flex justify-end mb-8">
                            <div className="w-80 bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-inner">
                              <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Subtotal</span>
                                  <span className="font-semibold text-slate-700">{formatCurrency(sale.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Discount</span>
                                  <span className="font-semibold text-emerald-600">-{formatCurrency(sale.discount)}</span>
                                </div>
                                <div className="flex justify-between font-black text-2xl pt-5 border-t-2 border-slate-200 mt-2 text-indigo-950">
                                  <span>Total</span>
                                  <span>{formatCurrency(sale.totalAmount)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                            <Button variant="outline" className="border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold px-6" onClick={() => handlePrintInvoice(sale)}>
                              <Printer className="h-4 w-4 mr-2" /> Print Invoice
                            </Button>
                            <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg font-semibold px-6 border-none" onClick={() => handleDownloadInvoicePDF(sale)}>
                              <Download className="h-4 w-4 mr-2" /> Download PDF
                            </Button>
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

      {/* Return Sale Dialog */}
      <Dialog open={!!saleToReturn} onOpenChange={(open) => !open && setSaleToReturn(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-red-100 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-red-50/50 pb-4 mb-4">
            <DialogTitle className="text-xl font-bold text-red-600">Manage Return</DialogTitle>
            <DialogDescription className="pt-2 text-slate-600">
              Select the quantities to return and provide a reason. Stock will be restored to your inventory.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Price</TableHead>
                    <TableHead className="text-center">Return Qty</TableHead>
                    <TableHead className="text-right">Refund Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">{formatCurrency(item.unitPrice)}</TableCell>
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
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end items-center gap-4 py-2 bg-slate-50 px-4 rounded-md border border-slate-100">
              <span className="font-semibold text-slate-600">Total Refund Amount:</span>
              <span className="text-2xl font-black text-red-600">
                {formatCurrency(returnItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="returnReason" className="font-semibold text-slate-700">Reason for Return <span className="text-red-500">*</span></Label>
              <Input 
                id="returnReason"
                placeholder="E.g. Defective item, customer changed mind..." 
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 border-t border-red-50/50 pt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setSaleToReturn(null)}>Cancel</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmReturnSale}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
