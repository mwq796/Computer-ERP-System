import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

const outfit = Outfit({ subsets: ["latin"], weight: ['300', '400', '500', '600', '700'] });

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const metadata: Metadata = {
  title: "TechZone ERP | Computer Shop Management",
  description: "Modern Computer Shop ERP system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} bg-slate-50 text-slate-900 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/60 via-slate-50 to-emerald-50/30 selection:bg-indigo-500/30`}>
        <ToastContainer position="top-right" />
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden relative">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 z-10 relative">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
