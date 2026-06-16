-- Migration: 0002_products_and_stock
-- Tablas: categories, iva_rates, products, inventory, inventory_movements

CREATE TABLE categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES categories(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iva_rates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  rate INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  cost_cents INTEGER,
  category_id TEXT REFERENCES categories(id),
  iva_rate_id TEXT REFERENCES iva_rates(id),
  supplier_id TEXT,
  unit TEXT NOT NULL DEFAULT 'unidad' CHECK(unit IN ('unidad', 'kg', 'litro')),
  min_stock INTEGER NOT NULL DEFAULT 0,
  image_r2_key TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE inventory (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT NOT NULL UNIQUE REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_movements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity_change INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN')),
  reference_id TEXT,
  reference_type TEXT CHECK(reference_type IN ('SALE', 'PURCHASE', 'MANUAL')),
  notes TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id, created_at);

-- Alícuotas de IVA estándar de Argentina
INSERT INTO iva_rates (id, name, rate) VALUES
  (lower(hex(randomblob(16))), '21%', 2100),
  (lower(hex(randomblob(16))), '10.5%', 1050),
  (lower(hex(randomblob(16))), '0%', 0);

-- Categorías base de pet shop
INSERT INTO categories (id, name) VALUES
  (lower(hex(randomblob(16))), 'Alimentos'),
  (lower(hex(randomblob(16))), 'Accesorios'),
  (lower(hex(randomblob(16))), 'Higiene y Cuidado'),
  (lower(hex(randomblob(16))), 'Salud y Veterinaria'),
  (lower(hex(randomblob(16))), 'Juguetes');
