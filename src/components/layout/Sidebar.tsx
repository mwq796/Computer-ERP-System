"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  ShoppingCart,
  TrendingUp,
  Truck,
  Receipt,
  CreditCard,
  PieChart,
  Settings,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  { name: "Inventory", href: "/inventory", icon: Boxes },
  { name: "Purchases", href: "/purchases", icon: ShoppingCart },
  { name: "Sales", href: "/sales", icon: TrendingUp },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Reports", href: "/reports", icon: PieChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-white/40 backdrop-blur-2xl border-r border-white/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] hidden md:flex z-20 relative">
      <div className="flex h-16 items-center px-6 border-b border-white/40">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-1.5 rounded-lg shadow-md shadow-indigo-500/20">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          TechZone ERP
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="grid gap-1.5 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "bg-white shadow-sm shadow-indigo-500/5 text-primary border border-white/60 font-semibold"
                    : "text-slate-500 hover:bg-white/60 hover:text-indigo-700 hover:shadow-sm border border-transparent hover:border-white/40"
                )}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-l-xl"></div>}
                <item.icon className={cn("h-4 w-4 transition-transform duration-300 group-hover:scale-110", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t border-white/40 mt-auto">
        <div className="bg-white/50 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm">
          <p className="text-xs font-semibold text-indigo-900 mb-1">Premium Version</p>
          <p className="text-[10px] text-slate-500">Enhanced UI Experience</p>
        </div>
      </div>
    </div>
  );
}
