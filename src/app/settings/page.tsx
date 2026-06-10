"use client";
import { toast } from "react-toastify";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Store, CreditCard, Users as UsersIcon, Bell, Plus, MoreHorizontal, ShieldCheck, ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const shopInfo = {
    name: "Subway Franchise",
    owner: "Owner Name",
    email: "contact@subway.demo",
    phone: "+92 300 1234567",
    address: "Food Court, Main Market"
  };

  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "Staff", status: "Active" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const handleDeleteUser = (id: string) => setDeleteConfirmId(id);
  const supabase = createClient();

  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase.from('users').select('*');
      if (data) {
        setUsers(data);
      }
      setIsLoadingUsers(false);
    }
    loadUsers();
  }, []);

  const resetUserForm = () => {
    setUserForm({ name: "", email: "", role: "Staff", status: "Active" });
    setEditingUser(null);
  };

  const handleEditUserClick = (user: any) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setIsAddUserOpen(true);
  };

  const executeDelete = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      toast.error("Error deleting user: " + error.message);
      return;
    }
    setUsers(users.filter(u => u.id !== id));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const { error } = await supabase.from('users').update({
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        status: userForm.status
      }).eq('id', editingUser.id);
      if (error) {
        toast.error("Error updating user: " + error.message);
        return;
      }
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...userForm } : u));
    } else {
      const newId = `U${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const dbUser = {
        id: newId,
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        status: userForm.status
      };
      const { error } = await supabase.from('users').insert([dbUser]);
      if (error) {
        toast.error("Error adding user: " + error.message);
        return;
      }
      setUsers([dbUser, ...users]);
    }
    setIsAddUserOpen(false);
    resetUserForm();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your shop preferences and configuration.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-slate-100/50 p-1 rounded-xl">
          <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><Store className="h-4 w-4 mr-2" /> General</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><CreditCard className="h-4 w-4 mr-2" /> Payments</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><UsersIcon className="h-4 w-4 mr-2" /> Users</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Shop Information</CardTitle>
              <CardDescription>
                Update your business details. This information will appear on invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Shop Name</Label>
                  <Input id="shopName" defaultValue={shopInfo.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Owner Name</Label>
                  <Input id="ownerName" defaultValue={shopInfo.owner} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue={shopInfo.email} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue={shopInfo.phone} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input id="address" defaultValue={shopInfo.address} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments" className="mt-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Configure how you accept payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Easypaisa</h4>
                  <p className="text-sm text-slate-500">Connected to 0300-XXXXXXX</p>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">JazzCash</h4>
                  <p className="text-sm text-slate-500">Connected to 0300-XXXXXXX</p>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Bank Transfer</h4>
                  <p className="text-sm text-slate-500">Meezan Bank - XXXXXXXXXX</p>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
              <Button variant="outline" className="w-full border-dashed border-2">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage who has access to your shop's dashboard.</CardDescription>
              </div>
              <Dialog open={isAddUserOpen} onOpenChange={(open) => {
                setIsAddUserOpen(open);
                if (!open) resetUserForm();
              }}>
                <DialogTrigger render={<Button />}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl">
                  <form onSubmit={handleSaveUser}>
                    <DialogHeader className="border-b border-indigo-50/50 pb-4 mb-4">
                      <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
                      <DialogDescription className="text-indigo-600/70">
                        {editingUser ? "Update user access and details." : "Create a new user to give them access to the ERP."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="userName">Full Name</Label>
                        <Input id="userName" value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="userEmail">Email Address</Label>
                        <Input id="userEmail" type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={userForm.role} onValueChange={(val) => val && setUserForm({...userForm, role: val})} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="Staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={userForm.status} onValueChange={(val) => val && setUserForm({...userForm, status: val})} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">{editingUser ? "Update" : "Save"} User</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="py-8 text-center text-muted-foreground">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center text-sm">
                            {user.role === 'Admin' ? <ShieldAlert className="h-4 w-4 mr-2 text-indigo-600" /> : <ShieldCheck className="h-4 w-4 mr-2 text-slate-400" />}
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className={user.status === 'Active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-primary">
                              <MoreHorizontal className="h-4 w-4 text-slate-500" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEditUserClick(user)}>Edit User</DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => handleDeleteUser(user.id)}>Delete User</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 text-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm text-muted-foreground">
          Notification preferences are active. (Demo Mode)
        </TabsContent>
      </Tabs>
    
      <ConfirmModal 
        isOpen={!!deleteConfirmId} 
        onClose={() => setDeleteConfirmId(null)} 
        onConfirm={() => deleteConfirmId && executeDelete(deleteConfirmId)} 
        title="Confirm Deletion" 
        description="Are you sure you want to delete this user? This action cannot be undone." 
      />
    </div>
  );
}