-- ==============================================================================
-- Accounting Schema Update (Double Entry System)
-- ==============================================================================

-- 1. Chart of Accounts Table
CREATE TABLE accounts (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense, COGS
    balance DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Active'
);

-- 2. Journals / Vouchers Table
CREATE TABLE journals (
    id VARCHAR(50) PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference VARCHAR(100),
    description TEXT,
    type VARCHAR(50) -- Payment, Receipt, Journal, Purchase, Sales, Contra
);

-- 3. Journal Lines Table
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

-- Disable RLS for Next.js direct access (matching existing schema setup)
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE journals DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines DISABLE ROW LEVEL SECURITY;
