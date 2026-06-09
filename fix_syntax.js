const fs = require('fs');

// Fix sales/page.tsx
let salesContent = fs.readFileSync('src/app/sales/page.tsx', 'utf8');

// Fix submitStatusUpdate syntax error in sales
const salesSubmitRegex = /const submitStatusUpdate = async \(\) => \{[\s\S]*?setStatusUpdateId\(null\);\s*\};\s*const submitStatusUpdate = async \(\) => \{[\s\S]*?setStatusUpdateId\(null\);\s*\};/g;
if (salesSubmitRegex.test(salesContent)) {
  salesContent = salesContent.replace(salesSubmitRegex, `const submitStatusUpdate = async () => {
    if (!statusUpdateId) return;
    let finalStatus = newStatusValue;
    
    const { error } = await supabase.from('sales').update({ payment_status: finalStatus }).eq('id', statusUpdateId);
    if (error) {
      toast.error("Error updating status: " + error.message);
      return;
    }
    
    await recordSaleJournal(statusUpdateId);
    setSales(sales.map(item => item.id === statusUpdateId ? { ...item, paymentStatus: finalStatus } : item));
    setStatusUpdateId(null);
  };`);
} else {
  // If not duplicated, just replace the malformed one
  const salesSubmitRegex2 = /const submitStatusUpdate = async \(\) => \{[\s\S]*?setStatusUpdateId\(null\);\s*\};/g;
  salesContent = salesContent.replace(salesSubmitRegex2, `const submitStatusUpdate = async () => {
    if (!statusUpdateId) return;
    let finalStatus = newStatusValue;
    
    const { error } = await supabase.from('sales').update({ payment_status: finalStatus }).eq('id', statusUpdateId);
    if (error) {
      toast.error("Error updating status: " + error.message);
      return;
    }
    
    await recordSaleJournal(statusUpdateId);
    setSales(sales.map(item => item.id === statusUpdateId ? { ...item, paymentStatus: finalStatus } : item));
    setStatusUpdateId(null);
  };`);
}

fs.writeFileSync('src/app/sales/page.tsx', salesContent);

// Fix purchases/page.tsx
let purchasesContent = fs.readFileSync('src/app/purchases/page.tsx', 'utf8');

// Fix floating JSX in purchases
const purchasesJsxRegex = /\s*placeholder="Enter amount paid\.\.\."\s*min="0"\s*\/>\s*<div className="text-xs text-muted-foreground flex justify-between">\s*<span>Remaining Balance:<\/span>\s*<span className="font-medium text-orange-600">\{formatCurrency\(totalAmount - paidAmount\)\}<\/span>\s*<\/div>\s*<\/div>\s*\)\}/;
purchasesContent = purchasesContent.replace(purchasesJsxRegex, '');

// Fix submitStatusUpdate syntax error in purchases
const purSubmitRegex = /const submitStatusUpdate = async \(\) => \{[\s\S]*?setStatusUpdateId\(null\);\s*\}\s*const \{ error \} = await supabase.from\('purchases'\).update\(\{ payment_status: finalStatus \}\).eq\('id', statusUpdateId\);[\s\S]*?setStatusUpdateId\(null\);\s*\};/g;

purchasesContent = purchasesContent.replace(purSubmitRegex, `const submitStatusUpdate = async () => {
    if (!statusUpdateId) return;
    let finalStatus = newStatusValue;
    
    const { error } = await supabase.from('purchases').update({ payment_status: finalStatus }).eq('id', statusUpdateId);
    if (error) {
      toast.error("Error updating status: " + error.message);
      return;
    }
    
    await recordPurchaseJournal(statusUpdateId);
    setPurchases(purchases.map(item => item.id === statusUpdateId ? { ...item, paymentStatus: finalStatus } : item));
    setStatusUpdateId(null);
  };`);

// For purchases, if the previous regex didn't match the weird duplication format, let's catch it manually with a broader one
const purSubmitRegexFallback = /const submitStatusUpdate = async \(\) => \{[\s\S]*?handleProductSelect/;
const purSubmitReplacement = `const submitStatusUpdate = async () => {
    if (!statusUpdateId) return;
    let finalStatus = newStatusValue;
    
    const { error } = await supabase.from('purchases').update({ payment_status: finalStatus }).eq('id', statusUpdateId);
    if (error) {
      toast.error("Error updating status: " + error.message);
      return;
    }
    
    await recordPurchaseJournal(statusUpdateId);
    setPurchases(purchases.map(item => item.id === statusUpdateId ? { ...item, paymentStatus: finalStatus } : item));
    setStatusUpdateId(null);
  };

  const handleProductSelect`;
purchasesContent = purchasesContent.replace(purSubmitRegexFallback, purSubmitReplacement);

fs.writeFileSync('src/app/purchases/page.tsx', purchasesContent);

console.log('Fixed syntaxes');
