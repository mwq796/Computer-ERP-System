const fs = require('fs');
let content = fs.readFileSync('src/app/purchases/page.tsx', 'utf8');

const regex = /const handleEditPurchase = \(purchase: any\) => \{/;
const replacement = `const handleAddToCart = () => {
    if (!selectedProduct || !unitCost) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    
    const cost = parseFloat(unitCost);
    const q = typeof quantity === 'number' ? quantity : (parseInt(quantity as string) || 1);
    setCartItems([...cartItems, {
      product,
      quantity: q,
      unitCost: cost,
      amount: cost * q
    }]);
    
    setSelectedProduct("");
    setQuantity('');
    setUnitCost("");
  };

  const handleEditPurchase = (purchase: any) => {`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/app/purchases/page.tsx', content);
