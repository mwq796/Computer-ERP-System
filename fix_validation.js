const fs = require('fs');

// Fix sales/page.tsx
let salesContent = fs.readFileSync('src/app/sales/page.tsx', 'utf8');

// Default quantity to empty string instead of 1
salesContent = salesContent.replace('const [quantity, setQuantity] = useState<number | string>(1);', 'const [quantity, setQuantity] = useState<number | string>(\'\');');
salesContent = salesContent.replace('setQuantity(1);', 'setQuantity(\'\');');

// Input validation for discount and paidAmount to prevent negatives
salesContent = salesContent.replace(/setDiscount\(parseFloat\(e\.target\.value\) \|\| 0\)/g, "setDiscount(Math.max(0, parseFloat(e.target.value) || 0))");
salesContent = salesContent.replace(/setPaidAmount\(parseFloat\(e\.target\.value\) \|\| 0\)/g, "setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))");

// Ensure quantity onChange strictly handles positive numbers
const salesQtyOnChangeOld = `onChange={(e) => { const val = parseInt(e.target.value); setQuantity(isNaN(val) ? '' : val) }}`;
const salesQtyOnChangeNew = `onChange={(e) => { const val = parseInt(e.target.value); setQuantity(isNaN(val) || val <= 0 ? '' : val) }}`;
salesContent = salesContent.replace(salesQtyOnChangeOld, salesQtyOnChangeNew);

fs.writeFileSync('src/app/sales/page.tsx', salesContent);


// Fix purchases/page.tsx
let purchasesContent = fs.readFileSync('src/app/purchases/page.tsx', 'utf8');

// Default quantity to empty string instead of 1
purchasesContent = purchasesContent.replace('const [quantity, setQuantity] = useState<number | string>(1);', 'const [quantity, setQuantity] = useState<number | string>(\'\');');
purchasesContent = purchasesContent.replace('setQuantity(1);', 'setQuantity(\'\');');

// Default unitCost to empty string
purchasesContent = purchasesContent.replace('const [unitCost, setUnitCost] = useState("");', 'const [unitCost, setUnitCost] = useState("");');

// Input validation for discount and paidAmount to prevent negatives
purchasesContent = purchasesContent.replace(/setDiscount\(parseFloat\(e\.target\.value\) \|\| 0\)/g, "setDiscount(Math.max(0, parseFloat(e.target.value) || 0))");
purchasesContent = purchasesContent.replace(/setPaidAmount\(parseFloat\(e\.target\.value\) \|\| 0\)/g, "setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))");

// Ensure unitCost input doesn't allow negatives
const purUnitCostOld = `onChange={e => setUnitCost(e.target.value)}`;
const purUnitCostNew = `onChange={e => { const val = parseFloat(e.target.value); setUnitCost(isNaN(val) || val < 0 ? '' : e.target.value) }}`;
purchasesContent = purchasesContent.replace(purUnitCostOld, purUnitCostNew);

// Ensure quantity onChange strictly handles positive numbers
purchasesContent = purchasesContent.replace(salesQtyOnChangeOld, salesQtyOnChangeNew);

fs.writeFileSync('src/app/purchases/page.tsx', purchasesContent);

console.log('Inputs strictly validated and defaults removed');
