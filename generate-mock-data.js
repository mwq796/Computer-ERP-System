const fs = require('fs');

const generateProducts = () => {
  const products = [];
  const categories = ['Subs', 'Sides', 'Drinks', 'Ingredients'];
  const brands = {
    'Subs': ['Subway'],
    'Sides': ['Subway', 'Frito-Lay'],
    'Drinks': ['Coca-Cola', 'Pepsi', 'Nestle'],
    'Ingredients': ['Sysco', 'Local Farms']
  };

  for (let i = 1; i <= 60; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const brand = brands[category][Math.floor(Math.random() * brands[category].length)];
    const purchasePrice = Math.floor(Math.random() * 200) + 50;
    const sellingPrice = purchasePrice + Math.floor(purchasePrice * (0.5 + Math.random() * 0.5));
    const currentStock = Math.floor(Math.random() * 50);
    const minStock = Math.floor(Math.random() * 10) + 5;
    
    products.push({
      id: `P${i.toString().padStart(3, '0')}`,
      modelNumber: `${brand.toUpperCase()}-${category.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
      name: `${brand} ${category} Model ${i}`,
      category,
      brand,
      purchasePrice,
      sellingPrice,
      currentStock,
      minStock,
      warrantyMonths: [6, 12, 24, 36][Math.floor(Math.random() * 4)],
      status: currentStock === 0 ? 'Out of Stock' : (currentStock <= minStock ? 'Low Stock' : 'In Stock')
    });
  }
  return products;
};

const generateCustomers = () => {
  const customers = [];
  const names = ['Ali', 'Ahmed', 'Usman', 'Omar', 'Hamza', 'Bilal', 'Zain', 'Hassan', 'Saad', 'Faizan', 'Ayesha', 'Fatima', 'Zahra', 'Sana', 'Hira', 'Khadija', 'Maryam', 'Rida', 'Nida', 'Iqra', 'Tariq', 'Kamran', 'Faisal', 'Naveed', 'Rizwan'];
  
  for (let i = 1; i <= 25; i++) {
    customers.push({
      id: `C${i.toString().padStart(3, '0')}`,
      name: `${names[Math.floor(Math.random() * names.length)]} ${names[Math.floor(Math.random() * names.length)]}`,
      phone: `03${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      email: `customer${i}@example.com`,
      type: 'Registered Customer',
      balance: Math.floor(Math.random() * 10) > 6 ? Math.floor(Math.random() * 50000) : 0,
      totalPurchases: Math.floor(Math.random() * 200000)
    });
  }
  return customers;
};

const generateSuppliers = () => {
  const suppliers = [];
  const names = ['Sysco Food Services', 'Coca-Cola Beverages', 'Frito-Lay Distributors', 'Local Fresh Farms', 'Nestle Waters', 'Baking Supplies Co', 'Meat Packers Inc'];
  
  for (let i = 1; i <= 7; i++) {
    suppliers.push({
      id: `S${i.toString().padStart(3, '0')}`,
      name: names[i - 1],
      contactPerson: 'Mr. Supplier',
      phone: `03${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      balance: Math.floor(Math.random() * 10) > 7 ? Math.floor(Math.random() * 50000) : 0,
      totalPurchases: Math.floor(Math.random() * 500000) + 50000
    });
  }
  return suppliers;
};

const generateSales = (products, customers) => {
  const sales = [];
  const now = new Date();
  
  for (let i = 1; i <= 120; i++) {
    const isWalkIn = Math.random() > 0.6;
    const customer = isWalkIn ? { id: 'WALK-IN', name: 'Walk-In Customer' } : customers[Math.floor(Math.random() * customers.length)];
    
    // 1 to 4 items per sale
    const itemsCount = Math.floor(Math.random() * 4) + 1;
    const items = [];
    let totalAmount = 0;
    
    for (let j = 0; j < itemsCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const unitPrice = product.sellingPrice;
      const amount = quantity * unitPrice;
      totalAmount += amount;
      items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        amount
      });
    }
    
    const discount = Math.random() > 0.7 ? Math.floor(totalAmount * 0.05) : 0;
    const finalAmount = totalAmount - discount;
    
    let paymentStatus = 'Paid';
    let paidAmount = finalAmount;
    if (!isWalkIn) {
      const rand = Math.random();
      if (rand > 0.8) {
        paymentStatus = 'Unpaid';
        paidAmount = 0;
      } else if (rand > 0.6) {
        paymentStatus = 'Partial Paid';
        paidAmount = Math.floor(finalAmount * 0.5);
      }
    }
    
    const date = new Date(now.getTime() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000));
    
    sales.push({
      id: `INV-${i.toString().padStart(5, '0')}`,
      date: date.toISOString(),
      customerType: isWalkIn ? 'Walk-In Customer' : 'Registered Customer',
      customerId: customer.id,
      customerName: customer.name,
      items,
      subtotal: totalAmount,
      discount,
      totalAmount: finalAmount,
      paidAmount,
      paymentStatus,
      paymentMethod: ['Cash', 'Easypaisa', 'JazzCash', 'Bank Transfer'][Math.floor(Math.random() * 4)]
    });
  }
  return sales.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const generatePurchases = (products, suppliers) => {
  const purchases = [];
  const now = new Date();
  
  for (let i = 1; i <= 60; i++) {
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const itemsCount = Math.floor(Math.random() * 5) + 1;
    const items = [];
    let totalAmount = 0;
    
    for (let j = 0; j < itemsCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 20) + 5;
      const unitCost = product.purchasePrice;
      const amount = quantity * unitCost;
      totalAmount += amount;
      items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitCost,
        amount
      });
    }
    
    const date = new Date(now.getTime() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000));
    
    purchases.push({
      id: `PUR-${i.toString().padStart(5, '0')}`,
      date: date.toISOString(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      items,
      totalAmount,
      paymentStatus: Math.random() > 0.8 ? 'Unpaid' : 'Paid'
    });
  }
  return purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const generateExpenses = () => {
  const expenses = [];
  const now = new Date();
  const categories = ['Shop Rent', 'Employee Salaries', 'Electricity', 'Internet', 'Marketing', 'Transportation', 'Office Supplies', 'Maintenance'];
  
  for (let i = 1; i <= 40; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    let amount = 0;
    if (category === 'Shop Rent') amount = 50000;
    else if (category === 'Employee Salaries') amount = Math.floor(Math.random() * 50000) + 30000;
    else if (category === 'Electricity') amount = Math.floor(Math.random() * 20000) + 10000;
    else amount = Math.floor(Math.random() * 10000) + 1000;
    
    const date = new Date(now.getTime() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000));
    
    expenses.push({
      id: `EXP-${i.toString().padStart(5, '0')}`,
      date: date.toISOString(),
      category,
      description: `${category} for the month`,
      amount,
      paymentMethod: ['Cash', 'Bank Transfer'][Math.floor(Math.random() * 2)]
    });
  }
  return expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const generatePayments = () => {
  const payments = [];
  const now = new Date();
  
  for (let i = 1; i <= 30; i++) {
    const date = new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
    const method = ['Easypaisa', 'JazzCash', 'Raast', 'Bank Transfer'][Math.floor(Math.random() * 4)];
    
    payments.push({
      id: `PAY-${i.toString().padStart(5, '0')}`,
      date: date.toISOString(),
      reference: `TRX-${Math.floor(Math.random() * 100000000)}`,
      amount: Math.floor(Math.random() * 50000) + 5000,
      method,
      accountName: 'TechZone Official',
      accountNumber: `03${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      type: Math.random() > 0.5 ? 'Received' : 'Sent',
      partyName: Math.random() > 0.5 ? 'Customer XYZ' : 'Supplier ABC'
    });
  }
  return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const products = generateProducts();
const customers = generateCustomers();
const suppliers = generateSuppliers();
const sales = generateSales(products, customers);
const purchases = generatePurchases(products, suppliers);
const expenses = generateExpenses();
const payments = generatePayments();

const fileContent = `// Automatically generated mock data for TechZone Computer Store ERP

export const mockProducts = ${JSON.stringify(products, null, 2)};

export const mockCustomers = ${JSON.stringify(customers, null, 2)};

export const mockSuppliers = ${JSON.stringify(suppliers, null, 2)};

export const mockSales = ${JSON.stringify(sales, null, 2)};

export const mockPurchases = ${JSON.stringify(purchases, null, 2)};

export const mockExpenses = ${JSON.stringify(expenses, null, 2)};

export const mockPayments = ${JSON.stringify(payments, null, 2)};

export const shopInfo = {
  name: "Subway Franchise - Downtown",
  owner: "Ahmed Khan",
  address: "Downtown Sector, Rawalpindi",
  phone: "0300-1234567",
  email: "store102@subway.pk"
};

export const getDashboardData = () => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  
  const todaySales = mockSales.filter(s => s.date.startsWith(today)).reduce((sum, s) => sum + s.totalAmount, 0);
  const monthlySales = mockSales.filter(s => s.date.startsWith(thisMonth)).reduce((sum, s) => sum + s.totalAmount, 0);
  
  const todayPurchases = mockPurchases.filter(p => p.date.startsWith(today)).reduce((sum, p) => sum + p.totalAmount, 0);
  const monthlyPurchases = mockPurchases.filter(p => p.date.startsWith(thisMonth)).reduce((sum, p) => sum + p.totalAmount, 0);
  
  const totalExpenses = mockExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate approximate profit
  let totalCostOfGoodsSold = 0;
  mockSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = mockProducts.find(p => p.id === item.productId);
      if (product) {
        totalCostOfGoodsSold += product.purchasePrice * item.quantity;
      }
    });
  });
  
  const totalRevenue = mockSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const grossProfit = totalRevenue - totalCostOfGoodsSold;
  const netProfit = grossProfit - totalExpenses;
  
  const customerReceivables = mockCustomers.reduce((sum, c) => sum + c.balance, 0);
  const supplierPayables = mockSuppliers.reduce((sum, s) => sum + s.balance, 0);
  
  const lowStockProducts = mockProducts.filter(p => p.status === 'Low Stock').length;
  const outOfStockProducts = mockProducts.filter(p => p.status === 'Out of Stock').length;
  
  return {
    todaySales,
    monthlySales,
    todayPurchases,
    monthlyPurchases,
    grossProfit,
    netProfit,
    totalExpenses,
    customerReceivables,
    supplierPayables,
    lowStockProducts,
    outOfStockProducts,
    recentSales: mockSales.slice(0, 5),
    recentPurchases: mockPurchases.slice(0, 5)
  };
};

export const getMonthlyTrends = () => {
  // Return last 6 months of data for charts
  return [
    { name: 'Jan', sales: 400000, profit: 24000 },
    { name: 'Feb', sales: 300000, profit: 13980 },
    { name: 'Mar', sales: 200000, profit: 9800 },
    { name: 'Apr', sales: 278000, profit: 39080 },
    { name: 'May', sales: 189000, profit: 4800 },
    { name: 'Jun', sales: 239000, profit: 38000 },
  ];
};

export const getTopSellingProducts = () => {
  return [
    { name: 'Italian BMT (Footlong)', value: 400 },
    { name: 'Sweet Onion Teriyaki', value: 300 },
    { name: 'Chocolate Chip Cookie', value: 300 },
    { name: 'Fountain Drink (M)', value: 200 },
  ];
};
`;

fs.writeFileSync('./src/lib/mock-data.ts', fileContent);
console.log('Mock data generated successfully!');
