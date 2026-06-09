const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src/app', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    if (filePath.includes('layout.tsx')) {
      content = content.replace("import { Toaster } from 'sonner';", "import { ToastContainer } from 'react-toastify';\nimport 'react-toastify/dist/ReactToastify.css';");
      content = content.replace('<Toaster position="top-right" richColors closeButton />', '<ToastContainer position="top-right" />');
    }

    if (content.includes('import { toast } from "sonner";') || content.includes("import { toast } from 'sonner';")) {
      content = content.replace(/import \{ toast \} from ["']sonner["'];/g, 'import { toast } from "react-toastify";');
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log('Updated', filePath);
    }
  }
});
