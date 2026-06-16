-- Migration: 0005_sales
-- Tablas: sales, sale_items
--
-- Nota: la columna pet_id documentada en 10_diseno_base_de_datos.md se omite
-- por ahora porque el módulo de Mascotas (M09) todavía no existe (Fase 2).

CREATE TABLE sales (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  customer_id TEXT REFERENCES customers(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  cash_register_session_id TEXT NOT NULL REFERENCES cash_register_sessions(id),
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_iva_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'QR')),
  amount_paid_cents INTEGER NOT NULL,
  change_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'CANCELLED', 'PENDING_INVOICE')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sale_id TEXT NOT NULL REFERENCES sales(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  iva_rate INTEGER NOT NULL,
  iva_amount_cents INTEGER NOT NULL,
  subtotal_cents INTEGER NOT NULL
);

CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_session ON sales(cash_register_session_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
