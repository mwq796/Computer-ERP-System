import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We use the admin client to bypass any potential RLS if it was turned on,
// and to ensure we have full access during the migration.


export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    console.log("Starting Accounting Migration...");

    // 1. Initial Default Chart of Accounts
    const defaultAccounts = [
      { id: 'ACC-1001', code: '1001', name: 'Cash in Hand', type: 'Asset' },
      { id: 'ACC-1002', code: '1002', name: 'Bank Account', type: 'Asset' },
      { id: 'ACC-1003', code: '1003', name: 'Accounts Receivable', type: 'Asset' },
      { id: 'ACC-1004', code: '1004', name: 'Inventory', type: 'Asset' },
      { id: 'ACC-2001', code: '2001', name: 'Accounts Payable', type: 'Liability' },
      { id: 'ACC-3001', code: '3001', name: 'Owner Capital', type: 'Equity' },
      { id: 'ACC-3002', code: '3002', name: 'Retained Earnings', type: 'Equity' },
      { id: 'ACC-4001', code: '4001', name: 'Sales Revenue', type: 'Revenue' },
      { id: 'ACC-4002', code: '4002', name: 'Other Income', type: 'Revenue' },
      { id: 'ACC-5001', code: '5001', name: 'Cost of Goods Sold', type: 'Expense' },
      { id: 'ACC-6001', code: '6001', name: 'Rent Expense', type: 'Expense' },
      { id: 'ACC-6002', code: '6002', name: 'Utilities Expense', type: 'Expense' },
      { id: 'ACC-6003', code: '6003', name: 'Payroll Expense', type: 'Expense' },
      { id: 'ACC-6004', code: '6004', name: 'Marketing Expense', type: 'Expense' },
      { id: 'ACC-6005', code: '6005', name: 'General Expense', type: 'Expense' },
    ];

    // Clear existing (if running multiple times)
    await supabase.from('journal_lines').delete().neq('id', 0);
    await supabase.from('journals').delete().neq('id', '0');
    await supabase.from('accounts').delete().neq('id', '0');

    // Insert Accounts
    const { error: accError } = await supabase.from('accounts').insert(defaultAccounts);
    if (accError) throw new Error(`Accounts Error: ${accError.message}`);

    const journalsToInsert = [];
    const linesToInsert = [];

    // Helper to find account ID by name mapping
    const getAccountId = (name: string) => defaultAccounts.find(a => a.name === name)?.id || 'ACC-6005';

    // 2. Migrate Sales
    const { data: sales, error: salesError } = await supabase.from('sales').select('*, sale_items(*, products(purchase_price))');
    if (salesError) throw new Error(`Sales Fetch Error: ${salesError.message}`);

    for (const sale of sales || []) {
      const isPaid = sale.payment_status === 'Paid';
      const debitAccount = isPaid ? (sale.payment_method === 'Bank Transfer' ? 'ACC-1002' : 'ACC-1001') : 'ACC-1003';
      
      journalsToInsert.push({
        id: `JRN-${sale.id}`,
        date: sale.date,
        reference: sale.id,
        description: `Sale to customer ${sale.customer_id}`,
        type: 'Sales Voucher'
      });

      linesToInsert.push({
        journal_id: `JRN-${sale.id}`,
        account_id: debitAccount, // Debit Cash/AR
        debit: sale.total_amount,
        credit: 0,
        customer_id: sale.customer_id
      });

      linesToInsert.push({
        journal_id: `JRN-${sale.id}`,
        account_id: 'ACC-4001', // Credit Sales Revenue
        debit: 0,
        credit: sale.total_amount,
        customer_id: sale.customer_id
      });

      // Calculate COGS if sale_items exist
      let totalCogs = 0;
      if (sale.sale_items && Array.isArray(sale.sale_items)) {
        sale.sale_items.forEach((item: any) => {
          const cost = item.products?.purchase_price || 0;
          totalCogs += cost * item.quantity;
        });
      }

      if (totalCogs > 0) {
        linesToInsert.push({
          journal_id: `JRN-${sale.id}`,
          account_id: 'ACC-5001', // Debit COGS
          debit: totalCogs,
          credit: 0
        });
        linesToInsert.push({
          journal_id: `JRN-${sale.id}`,
          account_id: 'ACC-1004', // Credit Inventory
          debit: 0,
          credit: totalCogs
        });
      }
    }

    // 3. Migrate Purchases
    const { data: purchases, error: purError } = await supabase.from('purchases').select('*');
    if (purError) throw new Error(`Purchases Fetch Error: ${purError.message}`);

    for (const pur of purchases || []) {
      const isPaid = pur.payment_status === 'Paid';
      const creditAccount = isPaid ? 'ACC-1002' : 'ACC-2001'; // Paid from Bank, else Accounts Payable
      
      journalsToInsert.push({
        id: `JRN-${pur.id}`,
        date: pur.date,
        reference: pur.id,
        description: `Purchase from supplier ${pur.supplier_id}`,
        type: 'Purchase Voucher'
      });

      linesToInsert.push({
        journal_id: `JRN-${pur.id}`,
        account_id: 'ACC-1004', // Debit Inventory
        debit: pur.total_amount,
        credit: 0,
        supplier_id: pur.supplier_id
      });

      linesToInsert.push({
        journal_id: `JRN-${pur.id}`,
        account_id: creditAccount, // Credit Bank/AP
        debit: 0,
        credit: pur.total_amount,
        supplier_id: pur.supplier_id
      });
    }

    // 4. Migrate Expenses
    const { data: expenses, error: expError } = await supabase.from('expenses').select('*');
    if (expError) throw new Error(`Expenses Fetch Error: ${expError.message}`);

    for (const exp of expenses || []) {
      // Map category to expense account
      let expAccount = 'ACC-6005'; // General by default
      if (exp.category === 'Rent') expAccount = 'ACC-6001';
      if (exp.category === 'Utilities') expAccount = 'ACC-6002';
      if (exp.category === 'Payroll') expAccount = 'ACC-6003';
      if (exp.category === 'Marketing') expAccount = 'ACC-6004';

      const creditAccount = exp.payment_method === 'Cash' ? 'ACC-1001' : 'ACC-1002';

      journalsToInsert.push({
        id: `JRN-${exp.id}`,
        date: exp.date ? new Date(exp.date).toISOString() : new Date().toISOString(),
        reference: exp.id,
        description: exp.description || `Expense: ${exp.category}`,
        type: 'Payment Voucher'
      });

      linesToInsert.push({
        journal_id: `JRN-${exp.id}`,
        account_id: expAccount, // Debit Expense
        debit: exp.amount,
        credit: 0
      });

      linesToInsert.push({
        journal_id: `JRN-${exp.id}`,
        account_id: creditAccount, // Credit Cash/Bank
        debit: 0,
        credit: exp.amount
      });
    }

    // Insert Journals in batches to prevent payload limits
    for (let i = 0; i < journalsToInsert.length; i += 100) {
      const { error: jError } = await supabase.from('journals').insert(journalsToInsert.slice(i, i + 100));
      if (jError) throw new Error(`Journals Insert Error: ${jError.message}`);
    }

    // Insert Lines in batches
    for (let i = 0; i < linesToInsert.length; i += 100) {
      const { error: lError } = await supabase.from('journal_lines').insert(linesToInsert.slice(i, i + 100));
      if (lError) throw new Error(`Lines Insert Error: ${lError.message}`);
    }

    // Update account balances based on lines
    const { data: allLines } = await supabase.from('journal_lines').select('account_id, debit, credit');
    const balances: Record<string, number> = {};
    
    allLines?.forEach(line => {
      if (!balances[line.account_id]) balances[line.account_id] = 0;
      // Normal balance: Asset/Expense = Debit - Credit. Liab/Equity/Rev = Credit - Debit.
      // We will just store a raw value and interpret it dynamically later, but let's do a strict balance here based on type.
      // Wait, let's just use raw Debits - Credits. Positive = Debit balance, Negative = Credit balance.
      balances[line.account_id] += (line.debit - line.credit);
    });

    for (const [accId, bal] of Object.entries(balances)) {
      await supabase.from('accounts').update({ balance: bal }).eq('id', accId);
    }

    return NextResponse.json({ success: true, message: 'Migration completed successfully!' });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
