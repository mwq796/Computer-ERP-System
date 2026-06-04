"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CreditCard, Filter, ArrowUpRight, ArrowDownRight, Save } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [recordType, setRecordType] = useState("Sent");
  const [recordDesc, setRecordDesc] = useState("");
  const [recordAmount, setRecordAmount] = useState("");
  const [recordMethod, setRecordMethod] = useState("Cash");
  const supabase = createClient();

  const loadData = async () => {
      const [salesRes, purchasesRes, expensesRes] = await Promise.all([
        supabase.from('sales').select('id, date, total_amount, payment_method, payment_status, customers(name)'),
        supabase.from('purchases').select('id, date, total_amount, payment_status, suppliers(name)'),
        supabase.from('expenses').select('id, date, amount, payment_method, description, category')
      ]);

      const allTransactions: any[] = [];

      // Add Sales (Income)
      if (salesRes.data) {
        salesRes.data.forEach(s => {
          let paidAmount = 0;
          if (s.payment_status?.startsWith('Partial Paid:')) {
            paidAmount = parseFloat(s.payment_status.split(': ')[1]) || 0;
          } else if (s.payment_status === 'Paid') {
            paidAmount = s.total_amount;
          }

          if (paidAmount > 0) {
            allTransactions.push({
              id: `TX-${s.id}`,
              date: s.date,
              method: s.payment_method || 'Cash',
              accountName: 'Sales Revenue',
              accountNumber: '-',
              partyName: s.customers?.name || 'Walk-in',
              type: 'Received',
              amount: paidAmount,
              reference: s.id
            });
          }
        });
      }

      // Add Purchases (Outcome)
      if (purchasesRes.data) {
        purchasesRes.data.forEach(p => {
          let paidAmount = 0;
          if (p.payment_status?.startsWith('Partial Paid:')) {
            paidAmount = parseFloat(p.payment_status.split(': ')[1]) || 0;
          } else if (p.payment_status === 'Paid') {
            paidAmount = p.total_amount;
          }

          if (paidAmount > 0) {
            allTransactions.push({
              id: `TX-${p.id}`,
              date: p.date,
              method: 'Cash', // Defaulting to cash since purchase table lacks payment_method currently
              accountName: 'Purchase Expense',
              accountNumber: '-',
              partyName: p.suppliers?.name || 'Supplier',
              type: 'Sent',
              amount: paidAmount,
              reference: p.id
            });
          }
        });
      }

      // Add Expenses (Outcome and potential Income via negative values)
      if (expensesRes.data) {
        expensesRes.data.forEach(e => {
          allTransactions.push({
            id: `TX-${e.id}`,
            date: e.date,
            method: e.payment_method || 'Bank Transfer',
            accountName: e.category || 'Manual Entry',
            accountNumber: '-',
            partyName: e.description || 'Vendor',
            type: e.amount < 0 ? 'Received' : 'Sent',
            amount: Math.abs(e.amount),
            reference: e.id
          });
        });
      }

      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setTransactions(allTransactions);
      setIsLoading(false);
    };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordPayment = async () => {
    if (!recordDesc || !recordAmount) return;
    
    // Create a unique ID for manual entries
    const newId = `MAN-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalAmount = recordType === 'Received' ? -Math.abs(parseFloat(recordAmount)) : Math.abs(parseFloat(recordAmount));

    const { error } = await supabase.from('expenses').insert([{
      id: newId,
      description: recordDesc,
      category: 'Manual Payment',
      amount: finalAmount,
      date: new Date().toISOString(),
      payment_method: recordMethod,
      reference_number: `MAN-${Date.now()}`
    }]);

    if (!error) {
      setIsRecordOpen(false);
      setRecordDesc("");
      setRecordAmount("");
      setIsLoading(true);
      await loadData();
    } else {
      alert("Error recording payment");
    }
  };

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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.partyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "All" || t.type === filterType;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading payments...</div>;
  }

  return (
    <div className="space-y-6 relative z-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-indigo-950">Payments Ledger</h2>
          <p className="text-slate-500">Track all incoming and outgoing payments across accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={showFilters ? "default" : "outline"}
            className={showFilters ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none shadow-sm" : "bg-white/50 backdrop-blur-md border-white/60 text-slate-700"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
            <DialogTrigger 
              render={
                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20" />
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white/90 backdrop-blur-2xl border-white/60 shadow-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl text-indigo-950">Record Manual Payment</DialogTitle>
                <DialogDescription>
                  Log a manual incoming or outgoing payment transaction.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Transaction Type</Label>
                  <Select value={recordType} onValueChange={setRecordType}>
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Received">Received (Inflow)</SelectItem>
                      <SelectItem value="Sent">Sent (Outflow)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Amount (PKR)</Label>
                  <Input type="number" placeholder="0.00" value={recordAmount} onChange={(e) => setRecordAmount(e.target.value)} className="bg-white border-slate-200" />
                </div>
                <div className="grid gap-2">
                  <Label>Payment Method</Label>
                  <Select value={recordMethod} onValueChange={setRecordMethod}>
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Easypaisa">Easypaisa</SelectItem>
                      <SelectItem value="JazzCash">JazzCash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Description / Party</Label>
                  <Input placeholder="E.g. Office supplies or Client Name" value={recordDesc} onChange={(e) => setRecordDesc(e.target.value)} className="bg-white border-slate-200" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setIsRecordOpen(false)}>Cancel</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleRecordPayment}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white/40 backdrop-blur-xl p-4 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/50 flex flex-col sm:flex-row gap-4 mb-2 animate-in fade-in slide-in-from-top-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Search</label>
            <input 
              type="text" 
              placeholder="Search by party, reference, or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/60 border border-white/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Transaction Type</label>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-white/60 border border-white/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="All">All Types</option>
              <option value="Received">Received (Inflow)</option>
              <option value="Sent">Sent (Outflow)</option>
            </select>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {['Cash', 'Card', 'Bank Transfer', 'App'].map((method) => {
          const methodPayments = transactions.filter(p => p.method === method || (method === 'Cash' && p.method === 'Walk-in'));
          const balance = methodPayments.reduce((sum, p) => p.type === 'Received' ? sum + p.amount : sum - p.amount, 0);
          
          return (
            <div key={method} className="bg-white/40 backdrop-blur-xl p-4 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50">
                  <CreditCard className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-700">{method}</h3>
              </div>
              <p className="text-2xl font-bold text-indigo-950 relative z-10">{formatCurrency(Math.abs(balance))}</p>
              <p className="text-xs text-slate-500 mt-1 relative z-10">{balance >= 0 ? 'Net Inflow' : 'Net Outflow'}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white/40">
              <TableRow className="border-white/50">
                <TableHead className="font-semibold text-slate-600">Transaction ID</TableHead>
                <TableHead className="font-semibold text-slate-600">Date & Time</TableHead>
                <TableHead className="font-semibold text-slate-600">Account Details</TableHead>
                <TableHead className="font-semibold text-slate-600">Party</TableHead>
                <TableHead className="font-semibold text-slate-600">Type</TableHead>
                <TableHead className="text-right font-semibold text-slate-600">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">No transactions found matching your filters.</TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((payment) => (
                  <TableRow key={payment.id} className="border-white/50 hover:bg-white/40 transition-colors">
                    <TableCell className="font-medium text-slate-600">
                      <div className="flex flex-col">
                        <span>{payment.id}</span>
                        <span className="text-xs text-indigo-400">{payment.reference}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{formatDate(payment.date)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-700">{payment.method}</div>
                      <div className="text-xs text-slate-500">{payment.accountName} {payment.accountNumber !== '-' && `- ${payment.accountNumber}`}</div>
                    </TableCell>
                    <TableCell className="text-slate-600">{payment.partyName}</TableCell>
                    <TableCell>
                      {payment.type === 'Received' ? (
                        <span className="flex items-center text-emerald-600 bg-emerald-50/50 px-2 py-1 rounded-md text-xs font-semibold w-fit border border-emerald-100/50">
                          <ArrowDownRight className="mr-1 h-3 w-3" /> Received
                        </span>
                      ) : (
                        <span className="flex items-center text-rose-600 bg-rose-50/50 px-2 py-1 rounded-md text-xs font-semibold w-fit border border-rose-100/50">
                          <ArrowUpRight className="mr-1 h-3 w-3" /> Sent
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-700">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
