"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Search, Plus, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSuppliers() {
      const { data } = await supabase.from('suppliers').select('*');
      if (data) {
        const mappedSuppliers = data.map(s => ({
          id: s.id,
          name: s.name,
          contactPerson: s.contact_person || '',
          phone: s.phone || '',
          email: s.email || '',
          balance: s.balance || 0,
          totalPurchases: s.total_orders || 0
        }));
        setSuppliers(mappedSuppliers);
      }
      setIsLoading(false);
    }
    fetchSuppliers();
  }, []);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", contactPerson: "", phone: "" });

  const resetForm = () => {
    setFormData({ name: "", contactPerson: "", phone: "" });
    setEditingSupplier(null);
  };

  const handleEditClick = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || ""
    });
    setIsAddOpen(true);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) {
      alert("Error deleting supplier: " + error.message);
      return;
    }
    setSuppliers(suppliers.filter(s => s.id !== id));
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSupplier) {
      const dbSupplier = {
        name: formData.name,
        contact_person: formData.contactPerson,
        phone: formData.phone
      };

      const { error } = await supabase.from('suppliers').update(dbSupplier).eq('id', editingSupplier.id);
      
      if (error) {
        alert("Error updating supplier: " + error.message);
        return;
      }
      
      setSuppliers(suppliers.map(s => 
        s.id === editingSupplier.id 
          ? { ...s, name: formData.name, contactPerson: formData.contactPerson, phone: formData.phone } 
          : s
      ));
    } else {
      const newId = `S${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      const dbSupplier = {
        id: newId,
        name: formData.name,
        contact_person: formData.contactPerson,
        phone: formData.phone,
        total_orders: 0,
        balance: 0
      };

      const { error } = await supabase.from('suppliers').insert([dbSupplier]);
      
      if (error) {
        alert("Error adding supplier: " + error.message);
        return;
      }

      const newSupplier = {
        id: newId,
        name: formData.name,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        totalPurchases: 0,
        balance: 0
      };
      
      setSuppliers([newSupplier, ...suppliers]);
    }
    
    setIsAddOpen(false);
    resetForm();
  };

  const filteredSuppliers = suppliers.filter(supplier => 
    (supplier.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalPayables = suppliers.reduce((sum, s) => sum + s.balance, 0);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">Loading suppliers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
          <p className="text-muted-foreground">Manage your suppliers and track payable balances.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSaveSupplier}>
              <DialogHeader>
                <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="contactPerson" className="text-right">Contact Person</Label>
                  <Input id="contactPerson" value={formData.contactPerson} onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="col-span-3" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingSupplier ? "Update" : "Save"} Supplier</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Truck className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-red-50/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Total Payables</CardTitle>
            <div className="bg-red-100 p-2 rounded-lg">
              <span className="font-bold text-red-600 text-xs">PKR</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totalPayables)}</div>
            <p className="text-xs text-red-600 mt-1">Outstanding payments to suppliers</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search supplier by name..."
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
                <TableHead>Supplier ID</TableHead>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead className="text-right">Total Purchases</TableHead>
                <TableHead className="text-right">Payable Balance</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium text-slate-500">{supplier.id}</TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contactPerson}</TableCell>
                  <TableCell>{supplier.phone}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(supplier.totalPurchases)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={supplier.balance > 0 ? "text-red-600 font-bold" : "text-emerald-600 font-medium"}>
                      {formatCurrency(supplier.balance)}
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
                        <DropdownMenuItem onClick={() => handleEditClick(supplier)}>Edit Supplier</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => handleDeleteSupplier(supplier.id)}>Delete Supplier</DropdownMenuItem>
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
