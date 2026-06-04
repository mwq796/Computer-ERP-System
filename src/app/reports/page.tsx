"use client";

import { useState, useEffect } from "react";
import { fetchDashboardData } from "../actions";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Printer, PieChart as PieChartIcon, TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell, ComposedChart, Line, LineChart } from "recharts";

export default function ReportsPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const [dashRes, salesRes, purchasesRes, productsRes] = await Promise.all([
        fetchDashboardData(),
        supabase.from('sales').select('*, customers(name)'),
        supabase.from('purchases').select('*, suppliers(name)'),
        supabase.from('products').select('*')
      ]);

      setDashboardData(dashRes.dashboardData);
      setTrends(dashRes.trends);
      setTopProducts(dashRes.topProducts);
      setRevenueBreakdown(dashRes.revenueBreakdown || []);
      
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
          paymentStatus: pStatus 
        };
      }));
      if (purchasesRes.data) setPurchases(purchasesRes.data.map(p => {
        let pStatus = p.payment_status;
        let pAmount = 0;
        if (pStatus?.startsWith('Partial Paid:')) {
          pAmount = parseFloat(pStatus.split(': ')[1]) || 0;
          pStatus = 'Partial Paid';
        } else if (pStatus === 'Paid') {
          pAmount = p.total_amount;
        }
        return { 
          id: p.id,
          supplierName: p.suppliers?.name || 'Unknown',
          date: p.date,
          totalAmount: p.total_amount,
          paidAmount: pAmount,
          paymentStatus: pStatus 
        };
      }));
      if (productsRes.data) setProducts(productsRes.data.map(p => ({ currentStock: p.current_stock, purchasePrice: p.purchase_price })));
      
      setIsLoading(false);
    }
    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading || !dashboardData) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading reports...</div>;
  }

  // Adding basic missing fields that were in mock data but might not be explicitly returned by dashboardData yet
  const data = {
    ...dashboardData,
    grossProfit: dashboardData.monthlySales - dashboardData.monthlyPurchases,
    totalExpenses: dashboardData.monthlySales - dashboardData.monthlyPurchases - dashboardData.netProfit,
  };

  const profitMargin = (data.netProfit / (data.monthlySales || 1)) * 100;
  
  const pieData = [
    { name: 'Cost of Goods', value: data.monthlyPurchases },
    { name: 'Operating Expenses', value: data.totalExpenses },
    { name: 'Net Profit', value: data.netProfit },
  ];
  
  const unpaidSales = sales.filter(s => s.paymentStatus !== 'Paid');
  const unpaidPurchases = purchases.filter(p => p.paymentStatus !== 'Paid');
  
  const COLORS = ['#94a3b8', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Reports</h2>
          <p className="text-muted-foreground">Comprehensive overview of business performance and profitability.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pnl" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="sales">Sales & Revenue</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="tax">Tax Summary</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid / Outstanding</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pnl" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-indigo-600 text-white shadow-md border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-indigo-100 text-sm font-medium">Gross Revenue (This Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(data.monthlySales)}</div>
                <div className="text-indigo-200 text-sm mt-1 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" /> Total sales value
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800 text-white shadow-md border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-300 text-sm font-medium">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{products.length}</div>
                <p className="text-sm text-slate-400 mt-1">Unique items in inventory</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-600 text-white shadow-md border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-emerald-100 text-sm font-medium">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(data.netProfit)}</div>
                <div className="text-emerald-200 text-sm mt-1 flex items-center">
                  <PieChartIcon className="h-4 w-4 mr-1" /> {profitMargin.toFixed(1)}% Margin
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle>Income vs Expenses Trend</CardTitle>
                <CardDescription>6-month historical view</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trends}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => value >= 1000 || value <= -1000 ? `Rs ${(value/1000).toFixed(0)}k` : `Rs ${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="sales" name="Revenue" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="purchases" name="Expenses" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1 shadow-sm">
              <CardHeader>
                <CardTitle>Financial Breakdown</CardTitle>
                <CardDescription>Current Month Allocation</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData.map(d => ({ ...d, drawValue: Math.max(0, d.value) }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="drawValue"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(_: any, name: string, props: any) => [formatCurrency(props.payload.value), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-slate-600">{entry.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
              <CardDescription>Detailed breakdown for the current period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-100">
                  <span className="font-medium">Gross Revenue (Sales)</span>
                  <span className="font-medium text-indigo-600">{formatCurrency(data.monthlySales)}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-600 pl-4">Less: Cost of Goods Sold</span>
                  <span className="text-slate-600">({formatCurrency(data.monthlySales - data.grossProfit)})</span>
                </div>
                <div className="flex justify-between py-3 border-b-2 border-slate-200 bg-slate-50 px-4 rounded-md">
                  <span className="font-bold">Gross Profit</span>
                  <span className="font-bold text-slate-800">{formatCurrency(data.grossProfit)}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-600 pl-4">Less: Operating Expenses</span>
                  <span className="text-slate-600">({formatCurrency(data.totalExpenses)})</span>
                </div>
                <div className="flex justify-between py-4 border-b-2 border-indigo-200 bg-indigo-50/50 px-4 rounded-md">
                  <span className="font-bold text-lg text-indigo-900">Net Profit</span>
                  <span className="font-bold text-lg text-emerald-600">{formatCurrency(data.netProfit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sales" className="space-y-4 pt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>Highest revenue generators this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div className="font-medium text-slate-800">{product.name}</div>
                    <div className="font-bold text-indigo-600">{product.value} Sold</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="inventory" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Inventory Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="font-medium text-emerald-800">In Stock Items</span>
                  <span className="font-bold text-emerald-600">{products.length - data.lowStockProducts - data.outOfStockProducts}</span>
                </div>
                <div className="flex justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="font-medium text-amber-800">Low Stock Alerts</span>
                  <span className="font-bold text-amber-600">{data.lowStockProducts}</span>
                </div>
                <div className="flex justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <span className="font-medium text-red-800">Out of Stock</span>
                  <span className="font-bold text-red-600">{data.outOfStockProducts}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="tax" className="space-y-4 pt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Estimated Tax Liability</CardTitle>
              <CardDescription>Based on 17% standard sales tax</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between py-4 border-b-2 border-slate-200 bg-slate-50 px-4 rounded-md">
                <span className="font-bold text-lg">Total Tax Collected</span>
                <span className="font-bold text-lg text-emerald-600">{formatCurrency(data.monthlySales * 0.17)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="unpaid" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="text-orange-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Customer Receivables
                </CardTitle>
                <CardDescription>Unpaid sales invoices from customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600 mb-4">{formatCurrency(data.customerReceivables)}</div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {unpaidSales.map(sale => (
                    <div key={sale.id} className="flex justify-between items-center border-b border-orange-100 pb-3 last:border-0">
                      <div>
                        <div className="font-medium text-slate-800">{sale.customerName}</div>
                        <div className="text-xs text-slate-500">{sale.id} • {new Date(sale.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-700">{formatCurrency(sale.totalAmount - sale.paidAmount)}</div>
                        <div className="text-[10px] uppercase bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full inline-block mt-1">
                          {sale.paymentStatus}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/30">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Supplier Payables
                </CardTitle>
                <CardDescription>Unpaid purchase bills to suppliers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 mb-4">{formatCurrency(data.supplierPayables)}</div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {unpaidPurchases.map(purchase => (
                    <div key={purchase.id} className="flex justify-between items-center border-b border-red-100 pb-3 last:border-0">
                      <div>
                        <div className="font-medium text-slate-800">{purchase.supplierName}</div>
                        <div className="text-xs text-slate-500">{purchase.id} • {new Date(purchase.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-700">{formatCurrency(purchase.totalAmount)}</div>
                        <div className="text-[10px] uppercase bg-red-100 text-red-800 px-2 py-0.5 rounded-full inline-block mt-1">
                          {purchase.paymentStatus}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
