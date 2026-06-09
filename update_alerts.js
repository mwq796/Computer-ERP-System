const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}
const files = walk('./src/app');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('alert(')) {
    content = content.replace(/alert\(/g, 'toast.error(');
    if (!content.includes('sonner')) {
        content = 'import { toast } from "sonner";\n' + content;
    }
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
