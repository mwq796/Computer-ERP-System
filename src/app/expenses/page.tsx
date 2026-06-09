"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { recordExpenseJournal, deleteJournal } from "../accounting-actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Receipt, Filter, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (data) {
        setExpenses(data.map(e => ({
          id: e.id,
          date: e.date,
          category: e.category,
          description: e.description,
          paymentMethod: e.payment_method,
          amount: e.amount
        })));
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: "",
    description: "",
    paymentMethod: "Cash",
    amount: ""
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
      paymentMethod: "Cash",
      amount: ""
    });
    setEditingExpense(null);
  };

  const handleEditClick = (expense: any) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      category: expense.category || "",
      description: expense.description || "",
      paymentMethod: expense.paymentMethod || "Cash",
      amount: expense.amount.toString()
    });
    setIsAddOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      alert("Error deleting expense: " + error.message);
      return;
    }
    await deleteJournal(id);
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingExpense) {
      const dbExpense = {
        date: formData.date,
        category: formData.category,
        description: formData.description,
        payment_method: formData.paymentMethod,
        amount: parseFloat(formData.amount) || 0
      };

      const { error } = await supabase.from('expenses').update(dbExpense).eq('id', editingExpense.id);
      
      if (error) {
        alert("Error updating expense: " + error.message);
        return;
      }
      
      await recordExpenseJournal(editingExpense.id);
      setExpenses(expenses.map(exp => 
        exp.id === editingExpense.id 
          ? { 
              ...exp, 
              date: formData.date, 
              category: formData.category, 
              description: formData.description, 
              paymentMethod: formData.paymentMethod, 
              amount: parseFloat(formData.amount) || 0 
            } 
          : exp
      ));
    } else {
      const newId = `EXP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const dbExpense = {
        id: newId,
        date: formData.date,
        category: formData.category,
        description: formData.description,
        payment_method: formData.paymentMethod,
        amount: parseFloat(formData.amount) || 0
      };

      const { error } = await supabase.from('expenses').insert([dbExpense]);
      if (error) {
        alert("Error adding expense: " + error.message);
        return;
      }
      await recordExpenseJournal(newId);

      const newExpense = {
        id: newId,
        date: formData.date,
        category: formData.category,
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        amount: parseFloat(formData.amount) || 0,
      };
      
      setExpenses([newExpense, ...expenses]);
    }
    
    setIsAddOpen(false);
    resetForm();
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
    });
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading expenses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">Track and manage your operational expenses.</p>
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
              Add Expense
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSaveExpense}>
                <DialogHeader>
                  <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">Date</Label>
                    <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">Category</Label>
                    <Input id="category" placeholder="e.g. Utilities, Rent" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Description</Label>
                    <Input id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="paymentMethod" className="text-right">Payment</Label>
                    <Input id="paymentMethod" value={formData.paymentMethod} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">Amount</Label>
                    <Input id="amount" type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="col-span-3" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">{editingExpense ? "Update" : "Save"} Expense</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-xl shadow-sm">
            <Receipt className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-900">Total Expenses (Selected Period)</p>
            <h3 className="text-3xl font-bold text-indigo-700">{formatCurrency(totalExpenses)}</h3>
          </div>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-indigo-100 text-sm font-medium text-indigo-800">
          Viewing All Time
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Expense ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium text-slate-500">{expense.id}</TableCell>
                  <TableCell>{formatDate(expense.date)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {expense.category}
                    </span>
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.paymentMethod}</TableCell>
                  <TableCell className="text-right font-bold text-slate-700">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider delay={200}>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50" onClick={() => handleEditClick(expense)} />}>
                            <Edit className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>Edit Expense</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50" onClick={() => handleDeleteExpense(expense.id)} />}>
                            <Trash2 className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>Delete Expense</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
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
