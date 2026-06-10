"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { createClient } from "@/utils/supabase/client";
import { recordExpenseJournal, deleteJournal } from "../accounting-actions";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Receipt, Filter, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'month' | 'week'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const handleDeleteExpense = (id: string) => setDeleteConfirmId(id);
  const supabase = createClient();
  const router = useRouter();

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
    category: "Utilities",
    description: "",
    paymentMethod: "Cash",
    amount: ""
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: "Utilities",
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

  const executeDelete = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      toast.error("Error deleting expense: " + error.message);
      return;
    }
    await deleteJournal(id);
    setExpenses(expenses.filter(e => e.id !== id));
    toast.success("Expense deleted successfully!");
    router.refresh();
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount) return toast.warning("Description and Amount are required.");
    
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
        toast.error("Error updating expense: " + error.message);
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
      toast.success("Expense updated successfully!");
    router.refresh();
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
        toast.error("Error adding expense: " + error.message);
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
      toast.success("Expense added successfully!");
    router.refresh();
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

  const filteredExpenses = expenses.filter(e => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterPeriod === 'all') return true;
    const expenseDate = new Date(e.date);
    const now = new Date();
    if (filterPeriod === 'month') {
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
    }
    if (filterPeriod === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return expenseDate >= weekAgo;
    }
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

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
          
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <Filter className="mr-2 h-4 w-4" />
              Category: {filterCategory === 'all' ? 'All' : filterCategory}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterCategory('all')}>All Categories</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory('Utilities')}>Utilities</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory('Payroll')}>Payroll</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory('Rent')}>Rent</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory('Marketing')}>Marketing</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory('Maintenance')}>Maintenance</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory('Taxes')}>Taxes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory('Others')}>Others</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <Filter className="mr-2 h-4 w-4" />
              Filters: {filterPeriod === 'all' ? 'All Time' : filterPeriod === 'month' ? 'This Month' : 'Last 7 Days'}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterPeriod('all')}>All Time</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterPeriod('month')}>This Month</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterPeriod('week')}>Last 7 Days</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                    <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val || ""})}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Payroll">Payroll</SelectItem>
                        <SelectItem value="Rent">Rent</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Taxes">Taxes</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
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
          {filterPeriod === 'all' ? 'Viewing All Time' : filterPeriod === 'month' ? 'Viewing This Month' : 'Viewing Last 7 Days'}
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
              {filteredExpenses.map((expense) => (
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
    
      <ConfirmModal 
        isOpen={!!deleteConfirmId} 
        onClose={() => setDeleteConfirmId(null)} 
        onConfirm={() => deleteConfirmId && executeDelete(deleteConfirmId)} 
        title="Confirm Deletion" 
        description="Are you sure you want to delete this expense? This action cannot be undone." 
      />
    </div>
  );
}