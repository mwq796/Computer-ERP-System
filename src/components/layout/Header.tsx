"use client";

import { Bell, Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const shopInfo = {
  name: "Subway Franchise",
  owner: "Owner Name",
  email: "contact@subway.demo",
  phone: "+92 300 1234567",
  address: "Food Court, Main Market"
};

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/50 bg-white/40 backdrop-blur-2xl px-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] md:px-6 relative z-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-indigo-400" />
          <Input
            type="search"
            placeholder="Search anything..."
            className="w-64 rounded-full bg-white/50 backdrop-blur-sm pl-9 border border-white/60 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:bg-white transition-all duration-300 placeholder:text-slate-400"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-white"></span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary">
            <Avatar className="h-9 w-9 border border-slate-200 bg-primary/10">
              <AvatarImage alt={shopInfo.owner} />
              <AvatarFallback className="text-primary">{shopInfo.owner.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{shopInfo.owner}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {shopInfo.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
