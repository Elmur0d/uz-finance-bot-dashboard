const Database = require("better-sqlite3");
const path = require("path");
const dayjs = require("dayjs");

const db = new Database(path.join(__dirname, "..", "finance.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL CHECK(amount > 0),
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category_id INTEGER NOT NULL,
    note TEXT,
    txn_date TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'dashboard',
    created_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );
`);

const defaultCategories = [
  ["Sales", "income"],
  ["Service", "income"],
  ["Other Income", "income"],
  ["Logistics", "expense"],
  ["Salary", "expense"],
  ["Rent", "expense"],
  ["Utilities", "expense"],
  ["Marketing", "expense"],
  ["Supplies", "expense"],
  ["Tax", "expense"],
  ["Other Expense", "expense"],
];

const insertDefaultCategory = db.prepare(
  "INSERT OR IGNORE INTO categories(name, type, is_default, created_at) VALUES (?, ?, 1, ?)"
);
const now = dayjs().toISOString();
defaultCategories.forEach(([name, type]) => insertDefaultCategory.run(name, type, now));

const queries = {
  getCategories: db.prepare("SELECT * FROM categories ORDER BY type, name"),
  insertCategory: db.prepare(
    "INSERT INTO categories(name, type, is_default, created_at) VALUES (?, ?, 0, ?)"
  ),
  deleteCategory: db.prepare("DELETE FROM categories WHERE id = ?"),
  txnsByCategory: db.prepare("SELECT COUNT(*) AS count FROM transactions WHERE category_id = ?"),
  insertTxn: db.prepare(
    `INSERT INTO transactions(amount, type, category_id, note, txn_date, source, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  listTxns: db.prepare(
    `SELECT t.*, c.name AS category_name
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE (? IS NULL OR t.type = ?)
       AND (? IS NULL OR t.category_id = ?)
       AND (? IS NULL OR t.txn_date >= ?)
       AND (? IS NULL OR t.txn_date <= ?)
       AND (? IS NULL OR lower(COALESCE(t.note, '')) LIKE '%' || ? || '%')
     ORDER BY t.txn_date DESC, t.id DESC`
  ),
  getTxn: db.prepare("SELECT * FROM transactions WHERE id = ?"),
  deleteTxn: db.prepare("DELETE FROM transactions WHERE id = ?"),
  updateTxn: db.prepare(
    `UPDATE transactions SET amount = ?, type = ?, category_id = ?, note = ?, txn_date = ?
     WHERE id = ?`
  ),
};

function normalizeDate(input) {
  if (!input) return dayjs().format("YYYY-MM-DD");
  const d = dayjs(input);
  return d.isValid() ? d.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");
}

module.exports = { db, queries, normalizeDate };
