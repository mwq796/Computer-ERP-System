const fs = require('fs');

function applyStatusDialog(filePath, tableName) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add the state variables
  const stateCode = `  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<string>('Paid');
  const [newStatusAmount, setNewStatusAmount] = useState<number | string>('');`;
  
  if (!content.includes('statusUpdateId')) {
    content = content.replace('  const [isAddOpen, setIsAddOpen] = useState(false);', '  const [isAddOpen, setIsAddOpen] = useState(false);\n' + stateCode);
  }

  // Find the exact old handleEditStatus method and replace it
  const handleName = tableName === 'sales' ? 'handleEditSaleStatus' : 'handleEditPurchaseStatus';
  const oldMethodRegex = new RegExp(`const ${handleName} = async \\(id: string, currentStatus: string\\) => \\{[\\s\\S]*?\\};`, 'm');

  const recordName = tableName === 'sales' ? 'recordSaleJournal' : 'recordPurchaseJournal';
  const arrayName = tableName === 'sales' ? 'sales' : 'purchases';
  const setArrayName = tableName === 'sales' ? 'setSales' : 'setPurchases';

  const newMethod = `const ${handleName} = (id: string, currentStatus: string) => {
    setStatusUpdateId(id);
    let baseStatus = currentStatus;
    let baseAmount: number | string = '';
    if (currentStatus.startsWith('Partial Paid:')) {
      baseStatus = 'Partial Paid';
      baseAmount = parseFloat(currentStatus.split(': ')[1]) || '';
    } else if (currentStatus.startsWith('Partial Paid')) {
       baseStatus = 'Partial Paid';
    }
    setNewStatusValue(baseStatus === 'Partial Paid' ? 'Partial Paid' : (baseStatus === 'Paid' ? 'Paid' : 'Unpaid'));
    setNewStatusAmount(baseAmount);
  };

  const submitStatusUpdate = async () => {
    if (!statusUpdateId) return;
    let finalStatus = newStatusValue;
    if (newStatusValue === 'Partial Paid') {
      finalStatus = \`Partial Paid: \${newStatusAmount || 0}\`;
    }
    
    const { error } = await supabase.from('${tableName}').update({ payment_status: finalStatus }).eq('id', statusUpdateId);
    if (error) {
      toast.error("Error updating status: " + error.message);
      return;
    }
    
    await ${recordName}(statusUpdateId);
    ${setArrayName}(${arrayName}.map(item => item.id === statusUpdateId ? { ...item, paymentStatus: finalStatus } : item));
    setStatusUpdateId(null);
  };`;

  content = content.replace(oldMethodRegex, newMethod);

  // Add the Dialog JSX before the final </div>
  const dialogJsx = `
      {/* Status Update Dialog */}
      <Dialog open={!!statusUpdateId} onOpenChange={(open) => !open && setStatusUpdateId(null)}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-indigo-50/50 pb-4 mb-4">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Update Payment Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={newStatusValue} onValueChange={setNewStatusValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid in Full</SelectItem>
                  <SelectItem value="Partial Paid">Partial Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStatusValue === 'Partial Paid' && (
              <div className="space-y-2">
                <Label>Amount Paid (PKR)</Label>
                <Input 
                  type="number" 
                  value={newStatusAmount} 
                  onChange={e => { const val = parseFloat(e.target.value); setNewStatusAmount(isNaN(val) || val < 0 ? '' : e.target.value); }}
                  placeholder="Enter amount paid..." 
                  min="0" 
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-6 border-t border-indigo-50/50 pt-4">
            <Button variant="outline" onClick={() => setStatusUpdateId(null)}>Cancel</Button>
            <Button onClick={submitStatusUpdate}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}`;

  if (!content.includes('Status Update Dialog')) {
    content = content.replace(/    <\/div>[\r\n\s]*\);[\r\n\s]*\}/, dialogJsx);
  }

  fs.writeFileSync(filePath, content);
}

applyStatusDialog('src/app/sales/page.tsx', 'sales');
applyStatusDialog('src/app/purchases/page.tsx', 'purchases');

console.log('Status popups injected safely');
