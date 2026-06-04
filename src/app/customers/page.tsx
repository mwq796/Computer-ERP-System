"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, UserCheck, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCustomers() {
      const { data } = await supabase.from('customers').select('*');
      if (data) {
        const mappedCustomers = data.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          type: c.type,
          balance: c.balance,
          totalPurchases: c.total_purchases
        }));
        setCustomers(mappedCustomers);
      }
      setIsLoading(false);
    }
    fetchCustomers();
  }, []);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", type: "Registered Customer" });

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", type: "Registered Customer" });
    setEditingCustomer(null);
  };

  const handleEditClick = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      type: customer.type || "Registered Customer"
    });
    setIsAddOpen(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      alert("Error deleting customer: " + error.message);
      return;
    }
    setCustomers(customers.filter(c => c.id !== id));
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCustomer) {
      const dbCustomer = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        type: formData.type
      };

      const { error } = await supabase.from('customers').update(dbCustomer).eq('id', editingCustomer.id);
      
      if (error) {
        alert("Error updating customer: " + error.message);
        return;
      }
      
      setCustomers(customers.map(c => 
        c.id === editingCustomer.id 
          ? { ...c, ...formData } 
          : c
      ));
    } else {
      const newId = `C${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const dbCustomer = {
        id: newId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        type: formData.type,
        balance: 0,
        total_purchases: 0
      };

      const { error } = await supabase.from('customers').insert([dbCustomer]);
      
      if (error) {
        alert("Error adding customer: " + error.message);
        return;
      }

      const newCustomer = {
        ...dbCustomer,
        totalPurchases: 0
      };
      
      setCustomers([newCustomer, ...customers]);
    }
    
    setIsAddOpen(false);
    resetForm();
  };

  const filteredCustomers = customers.filter(customer => 
    (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (customer.phone || '').includes(searchTerm)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalReceivables = customers.reduce((sum, c) => sum + c.balance, 0);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">Manage your registered customers and track their balances.</p>
        </div>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSaveCustomer}>
                <DialogHeader>
                  <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">Type</Label>
                  <Input id="type" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="col-span-3" />
                </div>
              </div>
                <DialogFooter>
                  <Button type="submit">{editingCustomer ? "Update" : "Save"} Customer</Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered Customers</CardTitle>
            <div className="bg-indigo-100 p-2 rounded-lg">
              <UserCheck className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-orange-50/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Total Receivables</CardTitle>
            <div className="bg-orange-100 p-2 rounded-lg">
              <span className="font-bold text-orange-600 text-xs">PKR</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{formatCurrency(totalReceivables)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search by name or phone..."
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
                <TableHead>Customer ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead className="text-right">Total Purchases</TableHead>
                <TableHead className="text-right">Outstanding Balance</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium text-slate-500">{customer.id}</TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">{customer.phone}</div>
                    <div className="text-xs text-slate-500">{customer.email}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(customer.totalPurchases)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={customer.balance > 0 ? "text-orange-600 font-bold" : "text-emerald-600 font-medium"}>
                      {formatCurrency(customer.balance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Ledger</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(customer)}>Edit Customer</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => handleDeleteCustomer(customer.id)}>Delete Customer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
