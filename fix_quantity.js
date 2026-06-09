const fs = require('fs');

// Fix sales/page.tsx
let salesContent = fs.readFileSync('src/app/sales/page.tsx', 'utf8');

const salesCartAddOld = `    const q = typeof quantity === 'number' ? quantity : (parseInt(quantity as string) || 1);
    if (q < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }

    if (product.stock < q) {
      toast.error(\`Cannot add more than available stock (\${product.stock}).\`);
      return;
    }`;

const salesCartAddNew = `    const q = typeof quantity === 'number' ? quantity : (parseInt(quantity as string) || 1);
    if (q < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }

    const currentCartQty = cartItems.filter((item: any) => item.product.id === product.id).reduce((sum: number, item: any) => sum + item.quantity, 0);
    if (q + currentCartQty > product.stock) {
      toast.error(\`Not enough stock! You have \${currentCartQty} in cart, and only \${product.stock} total items are available.\`);
      return;
    }`;

salesContent = salesContent.replace(salesCartAddOld, salesCartAddNew);
fs.writeFileSync('src/app/sales/page.tsx', salesContent);


// Fix purchases/page.tsx
let purchasesContent = fs.readFileSync('src/app/purchases/page.tsx', 'utf8');

// 1. Update State
purchasesContent = purchasesContent.replace('const [quantity, setQuantity] = useState(1);', 'const [quantity, setQuantity] = useState<number | string>(1);');

// 2. Update Add to Cart Logic
const purCartAddOld = `    if (quantity < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }`;
const purCartAddNew = `    const q = typeof quantity === 'number' ? quantity : (parseInt(quantity as string) || 1);
    if (q < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }`;
purchasesContent = purchasesContent.replace(purCartAddOld, purCartAddNew);

const purCartObjOld = `      quantity: quantity,
      unitCost: parseFloat(unitCost),
      amount: parseFloat(unitCost) * quantity`;
const purCartObjNew = `      quantity: q,
      unitCost: parseFloat(unitCost),
      amount: parseFloat(unitCost) * q`;
purchasesContent = purchasesContent.replace(purCartObjOld, purCartObjNew);


// 3. Update UI
const purUiOld = `                    <div className="flex-1 space-y-2">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} min="1" />
                    </div>
                    <div className="flex items-end pb-1">
                      <Button variant="secondary" onClick={handleAddToCart} type="button">Add</Button>
                    </div>`;

const purUiNew = `                    <div className="flex-1 space-y-2">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <div className="flex items-center border rounded-md h-10 bg-white">
                        <button type="button" onClick={() => setQuantity(Math.max(1, (Number(quantity) || 1) - 1))} className="px-3 py-2 text-slate-600 hover:bg-slate-100 border-r rounded-l-md font-bold transition-colors">-</button>
                        <input type="number" className="w-full text-center outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium" value={quantity} onFocus={(e) => e.target.select()} onChange={(e) => { const val = parseInt(e.target.value); setQuantity(isNaN(val) ? '' : val) }} min="1" />
                        <button type="button" onClick={() => setQuantity((Number(quantity) || 0) + 1)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 border-l rounded-r-md font-bold transition-colors">+</button>
                      </div>
                    </div>
                    <div className="flex items-end pb-1">
                      <Button variant="secondary" className="h-10 px-6 font-medium" onClick={handleAddToCart} type="button">Add</Button>
                    </div>`;

purchasesContent = purchasesContent.replace(purUiOld, purUiNew);

fs.writeFileSync('src/app/purchases/page.tsx', purchasesContent);

console.log('Quantities fixed');
