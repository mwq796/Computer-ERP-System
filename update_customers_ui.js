const fs = require('fs');

let content = fs.readFileSync('src/app/customers/page.tsx', 'utf8');

// 1. Fix imports
if (!content.includes('import { toast }')) {
  content = '"use client";\nimport { toast } from "sonner";\n' + content.replace('"use client";\n', '');
}

// 2. Add State variables
if (!content.includes('ledgerCustomer')) {
  const stateInsert = `
  const [ledgerCustomer, setLedgerCustomer] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  const handleViewLedger = async (customer: any) => {
    setLedgerCustomer(customer);
    setIsLedgerOpen(true);
    const { data } = await supabase.from('sales').select('*').eq('customer_id', customer.id).order('date', { ascending: false });
    if (data) {
      setLedgerData(data);
    }
  };

  const handleWhatsapp = () => {
    if (!ledgerCustomer?.phone) {
      toast.error("No phone number available for this customer.");
      return;
    }
    let phone = ledgerCustomer.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '92' + phone.substring(1);
    }
    const message = \`Hello \${ledgerCustomer.name},\\n\\nYour current outstanding balance is PKR \${ledgerCustomer.balance || 0}.\\n\\nPlease find your ledger attached or contact us for details.\\n\\nThank you!\`;
    const url = \`https://wa.me/\${phone}?text=\${encodeURIComponent(message)}\`;
    window.open(url, '_blank');
  };
`;
  content = content.replace('const [editingCustomer, setEditingCustomer] = useState<any>(null);', stateInsert + '\n  const [editingCustomer, setEditingCustomer] = useState<any>(null);');
}

// 3. Add Modal UI right before the final </div> of the top section (where Add Customer Modal is)
if (!content.includes('Ledger Dialog')) {
  const modalUI = `
        {/* Ledger Dialog */}
        <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
          <DialogContent className="sm:max-w-3xl bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-indigo-50/50 pb-4 mb-4 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  {ledgerCustomer?.name} - Ledger
                </DialogTitle>
                <div className="text-sm text-slate-500 mt-1">Outstanding Balance: <span className={ledgerCustomer?.balance > 0 ? "text-orange-600 font-bold" : "text-emerald-600 font-medium"}>PKR {ledgerCustomer?.balance || 0}</span></div>
              </div>
              <Button onClick={handleWhatsapp} className="bg-green-600 hover:bg-green-700 text-white gap-2 mt-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                WhatsApp
              </Button>
            </DialogHeader>
            <div className="py-4">
              {ledgerData.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No transactions found for this customer.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice ID</TableHead>
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
                          <span className={\`px-2 py-1 rounded-full text-xs font-medium \${
                            tx.payment_status.startsWith('Paid') ? 'bg-emerald-100 text-emerald-700' :
                            tx.payment_status.startsWith('Partial') ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }\`}>
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

      <div className="grid gap-4 md:grid-cols-3">`;

  // We find the break between the top div and the stats cards
  content = content.replace('      </div>\n\n      <div className="grid gap-4 md:grid-cols-3">', modalUI);
}

// 4. Update Dropdown Menu Item
content = content.replace('<DropdownMenuItem>View Ledger</DropdownMenuItem>', '<DropdownMenuItem onClick={() => handleViewLedger(customer)}>View Ledger</DropdownMenuItem>');

// 5. Update Add Customer styling to fix missing classes
content = content.replace('<DialogContent className="sm:max-w-[425px]">', '<DialogContent className="sm:max-w-xl bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl">');
content = content.replace('<DialogHeader>', '<DialogHeader className="border-b border-indigo-50/50 pb-4 mb-4">');
content = content.replace('<DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>', '<DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>');
content = content.replace('<DialogFooter>', '<DialogFooter className="mt-6 border-t border-indigo-50/50 pt-4">');

fs.writeFileSync('src/app/customers/page.tsx', content);
console.log('Customer UI Updated!');
