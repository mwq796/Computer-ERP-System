"use server";

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function recordSaleJournal(saleId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch the full sale details
  const { data: sale } = await supabase.from('sales').select('*, sale_items(*, products(purchase_price))').eq('id', saleId).single();
  if (!sale) return { success: false, error: 'Sale not found' };

  // Delete any existing journal for this sale (if it's an update)
  await supabase.from('journals').delete().eq('reference', saleId);

  const isPaid = sale.payment_status?.startsWith('Paid') || sale.payment_status?.startsWith('Partial');
  const paidAmount = sale.payment_status?.startsWith('Partial') ? parseFloat(sale.payment_status.split(': ')[1]) || 0 : (isPaid ? sale.total_amount : 0);
  const unpaidAmount = sale.total_amount - paidAmount;

  const journals = [];
  const lines = [];

  journals.push({
    id: `JRN-${sale.id}-${Date.now()}`,
    date: sale.date,
    reference: sale.id,
    description: `Sale to customer ${sale.customer_id || 'Walk-in'}`,
    type: 'Sales Voucher'
  });

  const journalId = journals[0].id;

  if (paidAmount > 0) {
    const cashAccount = sale.payment_method === 'Bank Transfer' ? 'ACC-1002' : 'ACC-1001';
    lines.push({
      journal_id: journalId,
      account_id: cashAccount,
      debit: paidAmount,
      credit: 0,
      customer_id: sale.customer_id
    });
  }

  if (unpaidAmount > 0) {
    lines.push({
      journal_id: journalId,
      account_id: 'ACC-1003', // AR
      debit: unpaidAmount,
      credit: 0,
      customer_id: sale.customer_id
    });
  }

  lines.push({
    journal_id: journalId,
    account_id: 'ACC-4001', // Sales Revenue
    debit: 0,
    credit: sale.total_amount,
    customer_id: sale.customer_id
  });

  // Calculate COGS
  let totalCogs = 0;
  if (sale.sale_items) {
    sale.sale_items.forEach((item: any) => {
      const cost = item.products?.purchase_price || 0;
      totalCogs += cost * item.quantity;
    });
  }

  if (totalCogs > 0) {
    lines.push({ journal_id: journalId, account_id: 'ACC-5001', debit: totalCogs, credit: 0 }); // COGS
    lines.push({ journal_id: journalId, account_id: 'ACC-1004', debit: 0, credit: totalCogs }); // Inventory
  }

  await supabase.from('journals').insert(journals);
  await supabase.from('journal_lines').insert(lines);

  return { success: true };
}

export async function recordPurchaseJournal(purchaseId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: pur } = await supabase.from('purchases').select('*').eq('id', purchaseId).single();
  if (!pur) return { success: false, error: 'Purchase not found' };

  await supabase.from('journals').delete().eq('reference', purchaseId);

  const isPaid = pur.payment_status?.startsWith('Paid') || pur.payment_status?.startsWith('Partial');
  const paidAmount = pur.payment_status?.startsWith('Partial') ? parseFloat(pur.payment_status.split(': ')[1]) || 0 : (isPaid ? pur.total_amount : 0);
  const unpaidAmount = pur.total_amount - paidAmount;

  const journalId = `JRN-${pur.id}-${Date.now()}`;
  
  await supabase.from('journals').insert([{
    id: journalId,
    date: pur.date,
    reference: pur.id,
    description: `Purchase from supplier ${pur.supplier_id}`,
    type: 'Purchase Voucher'
  }]);

  const lines = [];
  lines.push({ journal_id: journalId, account_id: 'ACC-1004', debit: pur.total_amount, credit: 0, supplier_id: pur.supplier_id }); // Inventory

  if (paidAmount > 0) {
    lines.push({ journal_id: journalId, account_id: 'ACC-1002', debit: 0, credit: paidAmount, supplier_id: pur.supplier_id }); // Bank
  }
  if (unpaidAmount > 0) {
    lines.push({ journal_id: journalId, account_id: 'ACC-2001', debit: 0, credit: unpaidAmount, supplier_id: pur.supplier_id }); // AP
  }

  await supabase.from('journal_lines').insert(lines);
  return { success: true };
}

export async function recordExpenseJournal(expenseId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: exp } = await supabase.from('expenses').select('*').eq('id', expenseId).single();
  if (!exp) return { success: false, error: 'Expense not found' };

  await supabase.from('journals').delete().eq('reference', expenseId);

  let expAccount = 'ACC-6005';
  if (exp.category === 'Rent') expAccount = 'ACC-6001';
  if (exp.category === 'Utilities') expAccount = 'ACC-6002';
  if (exp.category === 'Payroll') expAccount = 'ACC-6003';
  if (exp.category === 'Marketing') expAccount = 'ACC-6004';

  const creditAccount = exp.payment_method === 'Cash' ? 'ACC-1001' : 'ACC-1002';
  const journalId = `JRN-${exp.id}-${Date.now()}`;

  await supabase.from('journals').insert([{
    id: journalId,
    date: exp.date ? new Date(exp.date).toISOString() : new Date().toISOString(),
    reference: exp.id,
    description: exp.description || `Expense: ${exp.category}`,
    type: 'Payment Voucher'
  }]);

  await supabase.from('journal_lines').insert([
    { journal_id: journalId, account_id: expAccount, debit: exp.amount, credit: 0 },
    { journal_id: journalId, account_id: creditAccount, debit: 0, credit: exp.amount }
  ]);
  
  return { success: true };
}

export async function deleteJournal(referenceId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.from('journals').delete().eq('reference', referenceId);
  return { success: true };
}


export async function recordSaleReturnJournal(saleId: string, refundAmount: number, customerId: string | null) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const journalId = `JRN-RET-${saleId}-${Date.now()}`;
  
  await supabase.from('journals').insert([{
    id: journalId,
    date: new Date().toISOString(),
    reference: saleId,
    description: `Return for Sale ${saleId}`,
    type: 'Credit Note'
  }]);

  const lines = [
    { journal_id: journalId, account_id: 'ACC-4001', debit: refundAmount, credit: 0, customer_id: customerId }, // Reverse Revenue
    { journal_id: journalId, account_id: 'ACC-1003', debit: 0, credit: refundAmount, customer_id: customerId }  // Reverse AR (or Bank, but we assume AR for simplicity or create store credit)
  ];

  await supabase.from('journal_lines').insert(lines);
  return { success: true };
}

export async function recordPurchaseReturnJournal(purchaseId: string, refundAmount: number, supplierId: string | null) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const journalId = `JRN-PRET-${purchaseId}-${Date.now()}`;
  
  await supabase.from('journals').insert([{
    id: journalId,
    date: new Date().toISOString(),
    reference: purchaseId,
    description: `Return for Purchase ${purchaseId}`,
    type: 'Debit Note'
  }]);

  const lines = [
    { journal_id: journalId, account_id: 'ACC-2001', debit: refundAmount, credit: 0, supplier_id: supplierId }, // Reverse AP
    { journal_id: journalId, account_id: 'ACC-1004', debit: 0, credit: refundAmount, supplier_id: supplierId }  // Reverse Inventory
  ];

  await supabase.from('journal_lines').insert(lines);
  return { success: true };
}
