-- Migration: 0003_customers
-- Tabla: customers

CREATE TABLE customers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  cuit TEXT,
  fiscal_condition TEXT NOT NULL DEFAULT 'Consumidor Final'
    CHECK(fiscal_condition IN ('RI', 'Monotributo', 'Exento', 'Consumidor Final')),
  email TEXT,
  phone TEXT,
  address TEXT,
  pets_notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX idx_customers_cuit ON customers(cuit);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);
