-- ==============================================================================
-- Subway POS & ERP Database Schema and Mock Data
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
    type VARCHAR(50) DEFAULT 'Walk-in', -- Walk-in, Corporate, App User
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

-- 3. PRODUCTS TABLE (Sandwiches, Ingredients, Drinks)
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- Subs, Sides, Drinks, Ingredients
    brand VARCHAR(50),
    purchase_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    current_stock INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    shelf_life_days INT, -- Replaced 'warranty_months' for a food business
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
    payment_method VARCHAR(50), -- Cash, Card, App
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
    category VARCHAR(50), -- Rent, Utilities, Payroll, Marketing, Royalty
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100)
);


-- ==============================================================================
-- INSERT MOCK DATA
-- ==============================================================================

-- Insert Subway Customers
INSERT INTO customers (id, name, type, phone, email, address, join_date) VALUES
('C001', 'Walk-in Customer', 'Walk-in', NULL, NULL, NULL, '2023-01-01'),
('C002', 'Sarah Jenkins', 'App User', '555-0101', 'sarah.j@email.com', '123 Main St', '2023-05-15'),
('C003', 'Downtown Office Corp', 'Corporate', '555-0102', 'lunch@downtowncorp.com', '456 Business Blvd', '2023-08-20');

-- Insert Subway Suppliers
INSERT INTO suppliers (id, name, contact_person, phone, email, address) VALUES
('S001', 'Sysco Food Services', 'Mike Rogers', '1-800-555-0001', 'orders@sysco.com', 'Sysco Regional Hub'),
('S002', 'Coca-Cola Beverages', 'Lisa Wong', '1-800-555-0002', 'supply@cocacola.com', 'Local Bottling Plant'),
('S003', 'Frito-Lay Distributors', 'Tom Hardy', '1-800-555-0003', 'chips@fritolay.com', 'Snack Distribution Center');

-- Insert Subway Products (Subs, Ingredients, Sides)
INSERT INTO products (id, sku, name, category, brand, purchase_price, selling_price, current_stock, min_stock, shelf_life_days) VALUES
('P001', 'SUB-IBMT-FL', 'Italian BMT (Footlong)', 'Subs', 'Subway', 3.50, 8.99, 100, 20, 1),
('P002', 'SUB-SOT-6IN', 'Sweet Onion Teriyaki (6-inch)', 'Subs', 'Subway', 2.00, 5.49, 150, 30, 1),
('P003', 'SID-CHOC-CK', 'Chocolate Chip Cookie', 'Sides', 'Subway', 0.30, 1.00, 300, 50, 3),
('P004', 'DRK-FOUN-MD', 'Fountain Drink (Medium)', 'Drinks', 'Coca-Cola', 0.20, 2.19, 500, 100, 90),
('P005', 'SID-LAY-CLS', 'Lay''s Classic Potato Chips', 'Sides', 'Frito-Lay', 0.50, 1.50, 200, 40, 180),
('P006', 'ING-BRD-ITL', 'Italian Bread (Dough)', 'Ingredients', 'Sysco', 0.15, 0.00, 400, 100, 7),
('P007', 'ING-MEAT-TK', 'Turkey Breast (Sliced)', 'Ingredients', 'Sysco', 4.00, 0.00, 50, 10, 14);

-- Insert Recent Sales (POS Orders)
INSERT INTO sales (id, customer_id, date, subtotal, discount, total_amount, payment_method, payment_status) VALUES
('INV-1001', 'C001', '2023-10-24 12:30:00', 10.49, 0.00, 10.49, 'Cash', 'Paid'),
('INV-1002', 'C002', '2023-10-24 13:15:00', 12.18, 0.00, 12.18, 'Card', 'Paid'),
('INV-1003', 'C003', '2023-10-24 11:00:00', 89.90, 10.00, 79.90, 'Card', 'Paid'); -- Corporate catering

-- Insert Sale Items (Order Details)
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total) VALUES
-- Order 1: Walk-in bought 1 Footlong BMT and 1 Chips
('INV-1001', 'P001', 1, 8.99, 8.99),
('INV-1001', 'P005', 1, 1.50, 1.50),
-- Order 2: App user bought 6-inch Teriyaki, Cookie, Drink
('INV-1002', 'P002', 1, 5.49, 5.49),
('INV-1002', 'P003', 2, 1.00, 2.00),
('INV-1002', 'P004', 1, 2.19, 2.19),
-- Order 3: Corporate bought 10 Footlong BMTs
('INV-1003', 'P001', 10, 8.99, 89.90);

-- Insert Recent Purchases (Restocking)
INSERT INTO purchases (id, supplier_id, date, subtotal, discount, total_amount, payment_status) VALUES
('PO-5001', 'S001', '2023-10-23 08:00:00', 260.00, 0.00, 260.00, 'Paid'),
('PO-5002', 'S002', '2023-10-20 09:30:00', 100.00, 5.00, 95.00, 'Unpaid');

-- Insert Purchase Items
INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, total) VALUES
-- Sysco Restock (Bread dough and Turkey)
('PO-5001', 'P006', 400, 0.15, 60.00),
('PO-5001', 'P007', 50, 4.00, 200.00),
-- Coca-Cola Restock
('PO-5002', 'P004', 500, 0.20, 100.00);

-- Insert Store Expenses
INSERT INTO expenses (id, description, category, amount, date, payment_method, reference_number) VALUES
('EXP-001', 'October Store Rent', 'Rent', 3500.00, '2023-10-01', 'Bank Transfer', 'TXN-99812'),
('EXP-002', 'Electricity Bill', 'Utilities', 450.00, '2023-10-15', 'Card', 'TXN-99844'),
('EXP-003', 'Staff Payroll (Bi-weekly)', 'Payroll', 2800.00, '2023-10-14', 'Bank Transfer', 'TXN-99850'),
('EXP-004', 'Staff Payroll (Bi-weekly)', 'Payroll', 2200.00, '2023-10-15', 'Bank Transfer', 'PAY-901');

-- Insert Users (For User Management)
INSERT INTO users (id, name, email, role, status) VALUES
('U001', 'Admin User', 'admin@subway.demo', 'Admin', 'Active'),
('U002', 'Staff Member 1', 'staff1@subway.demo', 'Staff', 'Active'),
('U003', 'Staff Member 2', 'staff2@subway.demo', 'Staff', 'Inactive');

-- Disable RLS for all tables so the Next.js client can read/write directly
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
