"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Printer, FileText, Search, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function ReportsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [journalLines, setJournalLines] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const [accRes, jrnRes, linesRes, custRes, suppRes] = await Promise.all([
        supabase.from('accounts').select('*').order('code'),
        supabase.from('journals').select('*').order('date', { ascending: false }),
        supabase.from('journal_lines').select('*, accounts(code, name, type), journals(date, reference, description)'),
        supabase.from('customers').select('*'),
        supabase.from('suppliers').select('*')
      ]);

      if (accRes.data) setAccounts(accRes.data);
      if (jrnRes.data) setJournals(jrnRes.data);
      if (linesRes.data) setJournalLines(linesRes.data);
      if (custRes.data) setCustomers(custRes.data);
      if (suppRes.data) setSuppliers(suppRes.data);
      
      setIsLoading(false);
    }
    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading Accounting Ledgers...</div>;
  }

  // Calculate Trial Balance Totals
  let tbDebit = 0;
  let tbCredit = 0;
  accounts.forEach(acc => {
    const isDebitBalance = ['Asset', 'Expense', 'COGS'].includes(acc.type);
    if (acc.balance !== 0) {
      if (isDebitBalance) {
        if (acc.balance > 0) tbDebit += acc.balance;
        else tbCredit += Math.abs(acc.balance);
      } else {
        if (acc.balance > 0) tbCredit += acc.balance; // Revenue/Liab/Equity positive balance means credit
        else tbDebit += Math.abs(acc.balance);
      }
    }
  });

  // Calculate PnL
  const revenueAccounts = accounts.filter(a => a.type === 'Revenue');
  const expenseAccounts = accounts.filter(a => a.type === 'Expense' || a.type === 'COGS');
  const totalRevenue = revenueAccounts.reduce((sum, a) => sum + (a.balance > 0 ? a.balance : 0), 0);
  const totalCOGS = accounts.filter(a => a.type === 'COGS').reduce((sum, a) => sum + a.balance, 0);
  const totalExpenses = expenseAccounts.filter(a => a.type !== 'COGS').reduce((sum, a) => sum + a.balance, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;

  // Calculate Balance Sheet
  const assets = accounts.filter(a => a.type === 'Asset');
  const liabilities = accounts.filter(a => a.type === 'Liability');
  const equity = accounts.filter(a => a.type === 'Equity');
  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiab = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0) + netProfit; // Add current year profit

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accounting Reports</h2>
          <p className="text-muted-foreground">Double-entry ledger reports and financial statements.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
          <Button><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
        </div>
      </div>

      <Tabs defaultValue="gl" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
          <TabsTrigger value="gl" className="py-2 text-xs">General Ledger</TabsTrigger>
          <TabsTrigger value="customer" className="py-2 text-xs">Customer Ledger</TabsTrigger>
          <TabsTrigger value="supplier" className="py-2 text-xs">Supplier Ledger</TabsTrigger>
          <TabsTrigger value="tb" className="py-2 text-xs">Trial Balance</TabsTrigger>
          <TabsTrigger value="pnl" className="py-2 text-xs">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bs" className="py-2 text-xs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash" className="py-2 text-xs">Cash Flow</TabsTrigger>
          <TabsTrigger value="vouchers" className="py-2 text-xs">Vouchers</TabsTrigger>
        </TabsList>
        
        {/* 1. GENERAL LEDGER */}
        <TabsContent value="gl" className="space-y-4 pt-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>General Ledger</CardTitle>
                <CardDescription>Detailed transaction history for all accounts.</CardDescription>
              </div>
              <div className="w-64">
                <Input placeholder="Search account or description..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher / Ref</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit (Dr)</TableHead>
                    <TableHead className="text-right">Credit (Cr)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalLines
                    .filter(l => 
                      l.accounts?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      l.journals?.reference?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .sort((a,b) => new Date(b.journals?.date).getTime() - new Date(a.journals?.date).getTime())
                    .slice(0, 100)
                    .map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(line.journals?.date)}</TableCell>
                      <TableCell className="font-medium">{line.journals?.reference}</TableCell>
                      <TableCell>{line.accounts?.code} - {line.accounts?.name}</TableCell>
                      <TableCell className="text-slate-500">{line.journals?.description}</TableCell>
                      <TableCell className="text-right">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</TableCell>
                      <TableCell className="text-right">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. CUSTOMER LEDGER */}
        <TabsContent value="customer" className="space-y-4 pt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Customer Ledger (Accounts Receivable)</CardTitle>
              <CardDescription>Statements for individual customers.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Total Receivables</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map(c => {
                    const custLines = journalLines.filter(l => l.customer_id === c.id && l.account_id === 'ACC-1003');
                    const dr = custLines.reduce((sum, l) => sum + l.debit, 0);
                    const cr = custLines.reduce((sum, l) => sum + l.credit, 0);
                    const bal = dr - cr;
                    if (bal === 0) return null;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.phone}</TableCell>
                        <TableCell className="text-right font-bold text-orange-600">{formatCurrency(bal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. SUPPLIER LEDGER */}
        <TabsContent value="supplier" className="space-y-4 pt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Supplier Ledger (Accounts Payable)</CardTitle>
              <CardDescription>Statements for individual suppliers.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Total Payables</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map(s => {
                    const supLines = journalLines.filter(l => l.supplier_id === s.id && l.account_id === 'ACC-2001');
                    const dr = supLines.reduce((sum, l) => sum + l.debit, 0);
                    const cr = supLines.reduce((sum, l) => sum + l.credit, 0);
                    const bal = cr - dr; // AP is liability, so credit increases it
                    if (bal === 0) return null;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.phone}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{formatCurrency(bal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. TRIAL BALANCE */}
        <TabsContent value="tb" className="space-y-4 pt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Trial Balance</CardTitle>
              <CardDescription>Summary of all account balances to ensure Debits = Credits.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.filter(a => a.balance !== 0).map(a => {
                    const isDebit = ['Asset', 'Expense', 'COGS'].includes(a.type);
                    const bal = Math.abs(a.balance);
                    const showDebit = (isDebit && a.balance > 0) || (!isDebit && a.balance < 0);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>{a.code}</TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>{a.type}</TableCell>
                        <TableCell className="text-right">{showDebit ? formatCurrency(bal) : '-'}</TableCell>
                        <TableCell className="text-right">{!showDebit ? formatCurrency(bal) : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={3} className="text-right">Total:</TableCell>
                    <TableCell className="text-right text-emerald-700">{formatCurrency(tbDebit)}</TableCell>
                    <TableCell className="text-right text-emerald-700">{formatCurrency(tbCredit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. PROFIT AND LOSS */}
        <TabsContent value="pnl" className="space-y-4 pt-4">
          <Card className="shadow-sm max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Income Statement (Profit & Loss)</CardTitle>
              <CardDescription>For the current reporting period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Revenue</h3>
                {revenueAccounts.map(a => (
                  <div key={a.id} className="flex justify-between py-1 text-sm pl-4">
                    <span>{a.name}</span>
                    <span>{formatCurrency(a.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-slate-800 bg-slate-50 px-4 rounded">
                  <span>Total Revenue</span>
                  <span>{formatCurrency(totalRevenue)}</span>
                </div>

                <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mt-6">Cost of Goods Sold (COGS)</h3>
                {accounts.filter(a => a.type === 'COGS').map(a => (
                  <div key={a.id} className="flex justify-between py-1 text-sm pl-4">
                    <span>{a.name}</span>
                    <span>{formatCurrency(a.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-slate-800 bg-slate-50 px-4 rounded">
                  <span>Total COGS</span>
                  <span>{formatCurrency(totalCOGS)}</span>
                </div>

                <div className="flex justify-between py-3 mt-4 border-y-2 border-slate-300 font-bold text-lg text-indigo-700">
                  <span>Gross Profit</span>
                  <span>{formatCurrency(grossProfit)}</span>
                </div>

                <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mt-6">Operating Expenses</h3>
                {expenseAccounts.filter(a => a.type !== 'COGS').map(a => (
                  <div key={a.id} className="flex justify-between py-1 text-sm pl-4">
                    <span>{a.name}</span>
                    <span>{formatCurrency(a.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-slate-800 bg-slate-50 px-4 rounded">
                  <span>Total Expenses</span>
                  <span>{formatCurrency(totalExpenses)}</span>
                </div>

                <div className="flex justify-between py-4 mt-6 border-y-4 border-double border-emerald-600 font-bold text-xl text-emerald-700 bg-emerald-50 px-4 rounded">
                  <span>Net Profit (Net Income)</span>
                  <span>{formatCurrency(netProfit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. BALANCE SHEET */}
        <TabsContent value="bs" className="space-y-4 pt-4">
          <Card className="shadow-sm max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Balance Sheet</CardTitle>
              <CardDescription>As of {formatDate(new Date().toISOString())}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Assets Side */}
                <div>
                  <h3 className="font-bold text-xl text-slate-800 border-b-2 pb-2 mb-4 text-center">ASSETS</h3>
                  {assets.filter(a => a.balance !== 0).map(a => (
                    <div key={a.id} className="flex justify-between py-2 text-sm border-b border-slate-100">
                      <span>{a.name}</span>
                      <span>{formatCurrency(a.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 mt-4 font-bold text-lg bg-indigo-50 px-4 rounded border-t-2 border-indigo-200 text-indigo-900">
                    <span>Total Assets</span>
                    <span>{formatCurrency(totalAssets)}</span>
                  </div>
                </div>

                {/* Liab & Equity Side */}
                <div>
                  <h3 className="font-bold text-xl text-slate-800 border-b-2 pb-2 mb-4 text-center">LIABILITIES & EQUITY</h3>
                  <h4 className="font-semibold text-slate-600 mb-2 mt-4 uppercase text-sm">Liabilities</h4>
                  {liabilities.filter(a => a.balance !== 0).map(a => (
                    <div key={a.id} className="flex justify-between py-2 text-sm border-b border-slate-100 pl-4">
                      <span>{a.name}</span>
                      <span>{formatCurrency(a.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-medium text-sm bg-slate-50 px-4 rounded mb-6">
                    <span>Total Liabilities</span>
                    <span>{formatCurrency(totalLiab)}</span>
                  </div>

                  <h4 className="font-semibold text-slate-600 mb-2 uppercase text-sm">Equity</h4>
                  {equity.filter(a => a.balance !== 0).map(a => (
                    <div key={a.id} className="flex justify-between py-2 text-sm border-b border-slate-100 pl-4">
                      <span>{a.name}</span>
                      <span>{formatCurrency(a.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 text-sm border-b border-slate-100 pl-4 text-emerald-600 font-medium">
                    <span>Net Income (Current Year)</span>
                    <span>{formatCurrency(netProfit)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-medium text-sm bg-slate-50 px-4 rounded mt-2">
                    <span>Total Equity</span>
                    <span>{formatCurrency(totalEquity)}</span>
                  </div>

                  <div className="flex justify-between py-3 mt-4 font-bold text-lg bg-indigo-50 px-4 rounded border-t-2 border-indigo-200 text-indigo-900">
                    <span>Total L & E</span>
                    <span>{formatCurrency(totalLiab + totalEquity)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. CASH FLOW */}
        <TabsContent value="cash" className="space-y-4 pt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
              <CardDescription>Inflows and outflows from Cash and Bank accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right text-emerald-600">Inflow</TableHead>
                    <TableHead className="text-right text-red-600">Outflow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalLines
                    .filter(l => l.account_id === 'ACC-1001' || l.account_id === 'ACC-1002')
                    .sort((a,b) => new Date(b.journals?.date).getTime() - new Date(a.journals?.date).getTime())
                    .map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(line.journals?.date)}</TableCell>
                      <TableCell className="font-medium">{line.journals?.reference}</TableCell>
                      <TableCell>{line.accounts?.name}</TableCell>
                      <TableCell className="text-slate-500">{line.journals?.description}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. VOUCHERS */}
        <TabsContent value="vouchers" className="space-y-4 pt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Journal Vouchers</CardTitle>
              <CardDescription>Original entries posted to the ledger.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {journals.slice(0, 50).map(j => {
                  const lines = journalLines.filter(l => l.journal_id === j.id);
                  const totalDr = lines.reduce((s,l) => s + l.debit, 0);
                  const totalCr = lines.reduce((s,l) => s + l.credit, 0);
                  return (
                    <div key={j.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800">{j.id}</span>
                          <span className="ml-4 text-sm text-slate-500">{formatDate(j.date)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-semibold uppercase">{j.type}</span>
                          <span className="ml-4 text-slate-600">Ref: {j.reference}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-slate-600 mb-3">{j.description}</p>
                        <Table>
                          <TableHeader className="bg-transparent">
                            <TableRow>
                              <TableHead className="h-8">Account</TableHead>
                              <TableHead className="h-8 text-right">Debit</TableHead>
                              <TableHead className="h-8 text-right">Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((l, i) => (
                              <TableRow key={i} className="border-none">
                                <TableCell className={`py-1 ${l.credit > 0 ? 'pl-8 text-slate-600' : 'font-medium'}`}>
                                  {l.accounts?.code} - {l.accounts?.name}
                                </TableCell>
                                <TableCell className="py-1 text-right">{l.debit > 0 ? formatCurrency(l.debit) : ''}</TableCell>
                                <TableCell className="py-1 text-right">{l.credit > 0 ? formatCurrency(l.credit) : ''}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t border-slate-200 bg-slate-50/50">
                              <TableCell className="py-2 text-right font-bold">Total:</TableCell>
                              <TableCell className="py-2 text-right font-bold text-indigo-700">{formatCurrency(totalDr)}</TableCell>
                              <TableCell className="py-2 text-right font-bold text-indigo-700">{formatCurrency(totalCr)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
