-- ==============================================================================
-- Computer Shop ERP & POS Database Schema and Mock Data
-- Designed based on the existing ERP structure.
-- ==============================================================================

-- 0. DROP EXISTING TABLES
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS journal_lines CASCADE;
DROP TABLE IF EXISTS journals CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- 1. USERS TABLE (For User Management)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'Staff',
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CUSTOMERS TABLE
CREATE TABLE customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'Walk-in', -- Walk-in, Corporate, Registered
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    total_purchases INT DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2) DEFAULT 0.00,
    join_date DATE,
    status VARCHAR(20) DEFAULT 'Active'
);

-- 2. SUPPLIERS TABLE
CREATE TABLE suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    total_orders INT DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Active'
);

-- 3. PRODUCTS TABLE (Hardware, Peripherals, Accessories)
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- Laptops, Processors, Monitors, Accessories
    brand VARCHAR(50),
    purchase_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    current_stock INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    shelf_life_days INT, -- Used as warranty_months in the frontend
    status VARCHAR(20) DEFAULT 'In Stock'
);

-- 4. SALES TABLE (Point of Sale Orders)
CREATE TABLE sales (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50), -- Cash, Card, Bank Transfer
    payment_status VARCHAR(50), -- Paid, Pending
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- 5. SALE ITEMS TABLE (Items in each order)
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY, -- Use AUTO_INCREMENT if on MySQL
    sale_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 6. PURCHASES TABLE (Stock Replenishment from Suppliers)
CREATE TABLE purchases (
    id VARCHAR(50) PRIMARY KEY,
    supplier_id VARCHAR(50),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50), -- Paid, Unpaid
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 7. PURCHASE ITEMS TABLE (Items bought from suppliers)
CREATE TABLE purchase_items (
    id SERIAL PRIMARY KEY, -- Use AUTO_INCREMENT if on MySQL
    purchase_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 8. EXPENSES TABLE (Store Operations)
CREATE TABLE expenses (
    id VARCHAR(50) PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50), -- Rent, Utilities, Payroll, Marketing
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100)
);

-- ==============================================================================
-- Accounting Schema Update (Double Entry System)
-- ==============================================================================

-- 9. Chart of Accounts Table
CREATE TABLE accounts (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense, COGS
    balance DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Active'
);

-- 10. Journals / Vouchers Table
CREATE TABLE journals (
    id VARCHAR(50) PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference VARCHAR(100),
    description TEXT,
    type VARCHAR(50) -- Payment, Receipt, Journal, Purchase, Sales, Contra
);

-- 11. Journal Lines Table
CREATE TABLE journal_lines (
    id SERIAL PRIMARY KEY,
    journal_id VARCHAR(50) NOT NULL,
    account_id VARCHAR(50) NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0.00,
    credit DECIMAL(15,2) DEFAULT 0.00,
    customer_id VARCHAR(50),
    supplier_id VARCHAR(50),
    description TEXT,
    FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- ==============================================================================
-- INSERT MOCK DATA
-- ==============================================================================

-- Insert Computer Shop Customers
INSERT INTO customers (id, name, type, phone, email, address, join_date) VALUES
('C001', 'Walk-in Customer', 'Walk-in', NULL, NULL, NULL, '2023-01-01'),
('C002', 'Alex Mercer', 'Registered', '555-0101', 'alex.m@email.com', '123 Main St', '2023-05-15'),
('C003', 'Tech Solutions Inc', 'Corporate', '555-0102', 'procurement@techsolutions.com', '456 Tech Park', '2023-08-20');

-- Insert Computer Shop Suppliers
INSERT INTO suppliers (id, name, contact_person, phone, email, address) VALUES
('S001', 'Ingram Micro', 'Mike Rogers', '1-800-555-0001', 'orders@ingrammicro.com', 'Silicon Valley Hub'),
('S002', 'ASUS Global', 'Lisa Wong', '1-800-555-0002', 'supply@asus.com', 'Taipei Manufacturing'),
('S003', 'Tech Data Corp', 'Tom Hardy', '1-800-555-0003', 'sales@techdata.com', 'Distribution Center');

-- Insert Computer Shop Products
INSERT INTO products (id, sku, name, category, brand, purchase_price, selling_price, current_stock, min_stock, shelf_life_days) VALUES
('P001', 'CPU-INT-I9', 'Intel Core i9-14900K', 'Processors', 'Intel', 45000.00, 52000.00, 15, 5, 36),
('P002', 'LAP-DL-XPS', 'Dell XPS 15 (2024)', 'Laptops', 'Dell', 180000.00, 210000.00, 8, 2, 12),
('P003', 'MON-LG-27', 'LG 27" UltraGear 144Hz', 'Monitors', 'LG', 35000.00, 42000.00, 20, 5, 24),
('P004', 'KB-LOG-MX', 'Logitech MX Keys', 'Keyboards', 'Logitech', 12000.00, 15000.00, 30, 10, 12),
('P005', 'SSD-SAM-1TB', 'Samsung 980 PRO 1TB NVMe', 'SSDs', 'Samsung', 14000.00, 18500.00, 50, 15, 60),
('P006', 'GPU-NV-4070', 'NVIDIA RTX 4070 Ti', 'Graphics Cards', 'NVIDIA', 85000.00, 98000.00, 10, 3, 36),
('P007', 'RAM-COR-32G', 'Corsair Vengeance 32GB DDR5', 'RAM', 'Corsair', 16000.00, 20000.00, 25, 10, 120);

-- Insert Recent Sales (POS Orders)
INSERT INTO sales (id, customer_id, date, subtotal, discount, total_amount, payment_method, payment_status) VALUES
('INV-1001', 'C001', '2023-10-24 12:30:00', 33500.00, 0.00, 33500.00, 'Cash', 'Paid'),
('INV-1002', 'C002', '2023-10-24 13:15:00', 210000.00, 5000.00, 205000.00, 'Card', 'Paid'),
('INV-1003', 'C003', '2023-10-24 11:00:00', 520000.00, 20000.00, 500000.00, 'Bank Transfer', 'Paid'); -- Corporate setup

-- Insert Sale Items (Order Details)
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total) VALUES
-- Order 1: Walk-in bought Keyboard and SSD
('INV-1001', 'P004', 1, 15000.00, 15000.00),
('INV-1001', 'P005', 1, 18500.00, 18500.00),
-- Order 2: Registered user bought Dell XPS
('INV-1002', 'P002', 1, 210000.00, 210000.00),
-- Order 3: Corporate bought 10 Intel Core i9s
('INV-1003', 'P001', 10, 52000.00, 520000.00);

-- Insert Recent Purchases (Restocking)
INSERT INTO purchases (id, supplier_id, date, subtotal, discount, total_amount, payment_status) VALUES
('PO-5001', 'S001', '2023-10-23 08:00:00', 700000.00, 0.00, 700000.00, 'Paid'),
('PO-5002', 'S003', '2023-10-20 09:30:00', 400000.00, 10000.00, 390000.00, 'Unpaid');

-- Insert Purchase Items
INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, total) VALUES
-- Ingram Micro Restock (SSDs)
('PO-5001', 'P005', 50, 14000.00, 700000.00),
-- Tech Data Restock (RAM)
('PO-5002', 'P007', 25, 16000.00, 400000.00);

-- Insert Store Expenses
INSERT INTO expenses (id, description, category, amount, date, payment_method, reference_number) VALUES
('EXP-001', 'October Store Rent', 'Rent', 85000.00, '2023-10-01', 'Bank Transfer', 'TXN-99812'),
('EXP-002', 'Electricity Bill', 'Utilities', 15450.00, '2023-10-15', 'Card', 'TXN-99844'),
('EXP-003', 'Staff Payroll (Bi-weekly)', 'Payroll', 128000.00, '2023-10-14', 'Bank Transfer', 'TXN-99850');

-- Insert Users (For User Management)
INSERT INTO users (id, name, email, role, status) VALUES
('U001', 'Admin User', 'admin@computererp.demo', 'Admin', 'Active'),
('U002', 'Staff Member 1', 'staff1@computererp.demo', 'Staff', 'Active'),
('U003', 'Staff Member 2', 'staff2@computererp.demo', 'Staff', 'Inactive');

-- Disable RLS for Next.js direct access
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE journals DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines DISABLE ROW LEVEL SECURITY;
