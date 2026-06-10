"use client";
import { toast } from "react-toastify";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Search, Plus, MoreHorizontal, FileText, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const handleDeleteSupplier = (id: string) => setDeleteConfirmId(id);
  const supabase = createClient();
  const router = useRouter();

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
  
  const [ledgerSupplier, setLedgerSupplier] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  const handleViewLedger = async (supplier: any) => {
    setLedgerSupplier(supplier);
    setIsLedgerOpen(true);
    const { data } = await supabase.from('purchases').select('*').eq('supplier_id', supplier.id).order('date', { ascending: false });
    if (data) {
      setLedgerData(data);
    }
  };

  const handleWhatsapp = () => {
    if (!ledgerSupplier?.phone) {
      toast.error("No phone number available for this supplier.");
      return;
    }
    let phone = ledgerSupplier.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '92' + phone.substring(1);
    }
    const message = `Hello ${ledgerSupplier.name},\n\nYour current outstanding balance on our end is PKR ${ledgerSupplier.balance || 0}.\n\nPlease find your ledger attached or contact us for details.\n\nThank you!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

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

  const executeDelete = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) {
      toast.error("Error deleting supplier: " + error.message);
      return;
    }
    setSuppliers(suppliers.filter(s => s.id !== id));
    toast.success("Supplier deleted successfully!");
    router.refresh();
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.warning("Supplier name is required.");
    
    if (editingSupplier) {
      const dbSupplier = {
        name: formData.name,
        contact_person: formData.contactPerson,
        phone: formData.phone
      };

      const { error } = await supabase.from('suppliers').update(dbSupplier).eq('id', editingSupplier.id);
      
      if (error) {
        toast.error("Error updating supplier: " + error.message);
        return;
      }
      
      setSuppliers(suppliers.map(s => 
        s.id === editingSupplier.id 
          ? { ...s, name: formData.name, contactPerson: formData.contactPerson, phone: formData.phone } 
          : s
      ));
      toast.success("Supplier updated successfully!");
    router.refresh();
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
        toast.error("Error adding supplier: " + error.message);
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
      toast.success("Supplier added successfully!");
    router.refresh();
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
        
        {/* Ledger Dialog */}
        <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
          <DialogContent className="sm:max-w-3xl bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-indigo-50/50 pb-4 mb-4 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  {ledgerSupplier?.name} - Ledger
                </DialogTitle>
                <div className="text-sm text-slate-500 mt-1">Outstanding Balance: <span className={ledgerSupplier?.balance > 0 ? "text-red-600 font-bold" : "text-emerald-600 font-medium"}>PKR {ledgerSupplier?.balance || 0}</span></div>
              </div>
              <Button onClick={handleWhatsapp} className="bg-green-600 hover:bg-green-700 text-white gap-2 mt-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                WhatsApp
              </Button>
            </DialogHeader>
            <div className="py-4">
              {ledgerData.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No transactions found for this supplier.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>PO ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerData.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-indigo-600">{tx.id}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.payment_status.startsWith('Paid') ? 'bg-emerald-100 text-emerald-700' :
                              tx.payment_status.startsWith('Partial') ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                            }`}>
                            {tx.payment_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">PKR {tx.total_amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
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
                    <TooltipProvider delay={200}>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={() => handleViewLedger(supplier)} />}>
                            <FileText className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>View Ledger</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50" onClick={() => handleEditClick(supplier)} />}>
                            <Edit className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>Edit Supplier</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50" onClick={() => handleDeleteSupplier(supplier.id)} />}>
                            <Trash2 className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>Delete Supplier</TooltipContent>
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
        description="Are you sure you want to delete this supplier? This action cannot be undone." 
      />
    </div>
  );
}