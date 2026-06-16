-- Migration: 0004_cash_register
-- Tablas: cash_register_sessions, cash_movements

CREATE TABLE cash_register_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id INTEGER NOT NULL REFERENCES users(id),
  opening_amount_cents INTEGER NOT NULL,
  closing_amount_cents INTEGER,
  expected_amount_cents INTEGER,
  difference_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED')),
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  notes TEXT
);

CREATE TABLE cash_movements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL REFERENCES cash_register_sessions(id),
  type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
  amount_cents INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'QR')),
  description TEXT NOT NULL,
  reference_id TEXT,
  reference_type TEXT NOT NULL DEFAULT 'MANUAL' CHECK(reference_type IN ('SALE', 'MANUAL')),
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cash_sessions_status ON cash_register_sessions(status);
CREATE INDEX idx_cash_sessions_user ON cash_register_sessions(user_id);
CREATE INDEX idx_cash_movements_session ON cash_movements(session_id, created_at);
