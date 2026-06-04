"use client";

import { useEffect, useState } from "react";
import { fetchDashboardData } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle, Users, Package, Truck, CreditCard } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await fetchDashboardData();
      setData(result.dashboardData);
      setTrends(result.trends);
      setTopProducts(result.topProducts);
      setRevenueBreakdown(result.revenueBreakdown);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading || !data) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading dashboard data from Supabase...</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your store today.</p>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="sales" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Sales Dashboard</TabsTrigger>
          <TabsTrigger value="purchases" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Purchases Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-sm bg-indigo-50/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-900">Today&apos;s Sales</CardTitle>
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <DollarSign className="h-4 w-4 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-700">{formatCurrency(data.todaySales)}</div>
                <p className="text-xs text-indigo-600/80 flex items-center mt-1">
                  Total revenue for today
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <DollarSign className="h-4 w-4 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.monthlySales)}</div>
                <p className="text-xs text-emerald-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit (Monthly)</CardTitle>
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.netProfit)}</div>
                <p className="text-xs text-emerald-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15% from last month
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Receivables</CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Users className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.customerReceivables)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending from {data.recentSales.filter((s: any) => s.paymentStatus !== 'Paid').length} invoices
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 shadow-sm border-none">
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
                <CardDescription>Monthly revenue and profit trends.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trends}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `$${value/1000}k`} 
                      />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-3 shadow-sm border-none">
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Based on units sold this month.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" hide />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20}>
                        {
                          topProducts.map((entry, index) => (
                            <div key={`cell-${index}`} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-4">
                    {topProducts.map((product, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="bg-indigo-50 p-1.5 rounded-md">
                            <Package className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                        <span className="font-bold">{product.value} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sales Activity */}
          <Card className="shadow-sm border-none">
            <CardHeader>
              <CardTitle>Today&apos;s & Recent Sales</CardTitle>
              <CardDescription>Most recent customer invoices generated.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{sale.customerName}</p>
                      <p className="text-xs text-muted-foreground">{sale.id} &bull; <span suppressHydrationWarning>{new Date(sale.date).toLocaleDateString()}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(sale.totalAmount)}</p>
                      <div className="flex items-center justify-end mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          sale.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                          sale.paymentStatus === 'Partial Paid' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {sale.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-sm bg-emerald-50/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-900">Today&apos;s Purchases</CardTitle>
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{formatCurrency(data.todayPurchases)}</div>
                <p className="text-xs text-emerald-600/80 mt-1">
                  Total spent on stock today
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
                <div className="bg-slate-100 p-2 rounded-lg">
                  <CreditCard className="h-4 w-4 text-slate-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.monthlyPurchases)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total purchase orders this month
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payables</CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Truck className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.supplierPayables)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending payments to suppliers
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-red-50/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-800">Inventory Alerts</CardTitle>
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{data.lowStockProducts + data.outOfStockProducts}</div>
                <p className="text-xs text-red-600/80 mt-1">
                  {data.outOfStockProducts} out of stock, {data.lowStockProducts} low stock
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Purchases Charts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-4">
            <Card className="col-span-7 shadow-sm border-none">
              <CardHeader>
                <CardTitle>Purchases Overview</CardTitle>
                <CardDescription>Monthly purchase trends.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trends}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value: number) => `$${value/1000}k`} 
                      />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="purchases" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchases)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Purchases Activity */}
          <Card className="shadow-sm border-none">
            <CardHeader>
              <CardTitle>Today&apos;s & Recent Purchases</CardTitle>
              <CardDescription>Most recent supplier purchase orders generated.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{purchase.supplierName}</p>
                      <p className="text-xs text-muted-foreground">{purchase.id} &bull; <span suppressHydrationWarning>{new Date(purchase.date).toLocaleDateString()}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(purchase.totalAmount)}</p>
                      <div className="flex items-center justify-end mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          purchase.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {purchase.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
