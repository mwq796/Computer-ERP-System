const fs = require('fs');
let content = fs.readFileSync('src/app/customers/page.tsx', 'utf8');

const target = `                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">Type</Label>
                  <Input id="type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="col-span-3" />
                </div>`;

content = content.replace(target, '');
fs.writeFileSync('src/app/customers/page.tsx', content);
console.log('Type field removed from Customers page');
