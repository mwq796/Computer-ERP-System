const fs = require('fs');

function removePartialPaidLogic(filePath, isSales) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove Partial Paid option from main form Select
  content = content.replace('<SelectItem value="Partial Paid">Partial Paid</SelectItem>', '');

  // 2. Remove Partial Paid amount input in main form
  const amountPaidRegex = /\{paymentStatus === "Partial Paid" && \([\s\S]*?\)\}/;
  content = content.replace(amountPaidRegex, '');

  // 3. Remove Partial Paid option from Update Modal
  content = content.replace('<SelectItem value="Partial Paid">Partial Paid</SelectItem>', '');

  // 4. Remove Partial Paid amount input in Update Modal
  const modalAmountPaidRegex = /\{newStatusValue === 'Partial Paid' && \([\s\S]*?\)\}/;
  content = content.replace(modalAmountPaidRegex, '');

  // 5. Update complete/create handler logic
  if (isSales) {
    const saleLogicOld = `    let finalPaidAmount = paidAmount;
    if (paymentStatus === 'Paid') finalPaidAmount = total;
    if (paymentStatus === 'Unpaid') finalPaidAmount = 0;

    let finalStatus = paymentStatus;
    if (paymentStatus === 'Partial Paid') {
      finalStatus = \`Partial Paid: \${finalPaidAmount}\`;
    }`;
    const saleLogicNew = `    let finalPaidAmount = 0;
    if (paymentStatus === 'Paid') finalPaidAmount = total;
    if (paymentStatus === 'Unpaid') finalPaidAmount = 0;

    let finalStatus = paymentStatus;`;
    content = content.replace(saleLogicOld, saleLogicNew);
  } else {
    const purLogicOld = `    let finalPaidAmount = paidAmount;
    if (paymentStatus === 'Paid') finalPaidAmount = totalAmount;
    if (paymentStatus === 'Unpaid') finalPaidAmount = 0;

    let finalStatus = paymentStatus;
    if (paymentStatus === 'Partial Paid') {
      finalStatus = \`Partial Paid: \${finalPaidAmount}\`;
    }`;
    const purLogicNew = `    let finalPaidAmount = 0;
    if (paymentStatus === 'Paid') finalPaidAmount = totalAmount;
    if (paymentStatus === 'Unpaid') finalPaidAmount = 0;

    let finalStatus = paymentStatus;`;
    content = content.replace(purLogicOld, purLogicNew);
  }

  // 6. Update handleEditStatus logic
  const handleName = isSales ? 'handleEditSaleStatus' : 'handleEditPurchaseStatus';
  const handleRegexOld = new RegExp(`const ${handleName} = \\(id: string, currentStatus: string\\) => \\{[\\s\\S]*?\\};`, 'm');
  
  const handleLogicNew = `const ${handleName} = (id: string, currentStatus: string) => {
    setStatusUpdateId(id);
    let baseStatus = currentStatus === 'Paid' ? 'Paid' : 'Unpaid';
    setNewStatusValue(baseStatus);
    setNewStatusAmount('');
  };`;
  content = content.replace(handleRegexOld, handleLogicNew);

  // 7. Update submitStatusUpdate logic
  const submitRegexOld = /const submitStatusUpdate = async \(\) => \{[\s\S]*?finalStatus = `Partial Paid: \$\{newStatusAmount \|\| 0\}`;[\s\S]*?\}/;
  
  const recordName = isSales ? 'recordSaleJournal' : 'recordPurchaseJournal';
  const tableName = isSales ? 'sales' : 'purchases';
  const setArrayName = isSales ? 'setSales' : 'setPurchases';
  const arrayName = isSales ? 'sales' : 'purchases';

  const submitLogicNew = `const submitStatusUpdate = async () => {
    if (!statusUpdateId) return;
    let finalStatus = newStatusValue;
    
    const { error } = await supabase.from('${tableName}').update({ payment_status: finalStatus }).eq('id', statusUpdateId);
    if (error) {
      toast.error("Error updating status: " + error.message);
      return;
    }
    
    await ${recordName}(statusUpdateId);
    ${setArrayName}(${arrayName}.map(item => item.id === statusUpdateId ? { ...item, paymentStatus: finalStatus } : item));
    setStatusUpdateId(null);
  }`;
  content = content.replace(submitRegexOld, submitLogicNew);
  
  // 8. Fix list rendering mappings for partial paid
  if (isSales) {
    const listMapOld = `        if (pStatus?.startsWith('Partial Paid:')) {
          pAmount = parseFloat(pStatus.split(': ')[1]) || 0;
          pStatus = 'Partial Paid';
        } else if (pStatus === 'Paid') {`;
    const listMapNew = `        if (pStatus === 'Paid') {`;
    content = content.replace(listMapOld, listMapNew);
  } else {
    const listMapOld = `        if (pStatus?.startsWith('Partial Paid:')) {
          pAmount = parseFloat(pStatus.split(': ')[1]) || 0;
          pStatus = 'Partial Paid';
        } else if (pStatus === 'Paid') {`;
    const listMapNew = `        if (pStatus === 'Paid') {`;
    content = content.replace(listMapOld, listMapNew);
  }

  // 9. Fix badge coloring for partial paid
  content = content.replace("sale.paymentStatus === 'Partial Paid' ? 'bg-amber-100 text-amber-700' :", "");
  content = content.replace("purchase.paymentStatus === 'Partial Paid' ? 'bg-amber-100 text-amber-700' :", "");
  content = content.replace("s.paymentStatus === 'Partial Paid' ? 'bg-amber-100 text-amber-700' :", "");
  content = content.replace("p.paymentStatus === 'Partial Paid' ? 'bg-amber-100 text-amber-700' :", "");

  fs.writeFileSync(filePath, content);
}

removePartialPaidLogic('src/app/sales/page.tsx', true);
removePartialPaidLogic('src/app/purchases/page.tsx', false);

console.log('Partial paid logic removed from Sales and Purchases.');
