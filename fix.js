const fs = require('fs');
let content = fs.readFileSync('src/app/suppliers/page.tsx', 'utf8');
content = content.replace('"use client";\nimport { toast } from "sonner";\n"use client";', '"use client";\nimport { toast } from "sonner";');
fs.writeFileSync('src/app/suppliers/page.tsx', content);
