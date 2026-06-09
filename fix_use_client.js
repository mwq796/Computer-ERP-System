const fs = require('fs');
const path = require('path');
const files = [
  'src/app/customers/page.tsx',
  'src/app/expenses/page.tsx',
  'src/app/payments/page.tsx',
  'src/app/products/page.tsx',
  'src/app/purchases/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/suppliers/page.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('import { toast } from "sonner";\n"use client";')) {
      content = content.replace('import { toast } from "sonner";\n"use client";', '"use client";\nimport { toast } from "sonner";');
      fs.writeFileSync(fullPath, content);
      console.log('Fixed ' + file);
    }
  }
});
