require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const dayjs = require("dayjs");
const { z } = require("zod");
const { queries, normalizeDate } = require("./db");
const { createBot } = require("./bot");

const app = express();
app.use(cors());
app.use(express.json());

const txnSchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  category_id: z.coerce.number().int().positive(),
  note: z.string().optional().nullable(),
  txn_date: z.string().optional(),
  source: z.string().optional(),
  created_by: z.string().optional(),
});

function safeParseTxn(body) {
  const parsed = txnSchema.safeParse(body);
  if (!parsed.success) return null;
  return parsed.data;
}

function periodTotals(start, end) {
  const txns = queries.listTxns.all(null, null, null, null, start, start, end, end, null, null);
  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense, count: txns.length };
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/categories", (_req, res) => res.json(queries.getCategories.all()));

app.post("/api/categories", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const type = req.body?.type;
  if (!name || !["income", "expense"].includes(type)) {
    return res.status(400).json({ error: "Invalid category payload" });
  }
  try {
    const info = queries.insertCategory.run(name, type, dayjs().toISOString());
    return res.status(201).json({ id: info.lastInsertRowid, name, type });
  } catch (e) {
    return res.status(409).json({ error: "Category already exists" });
  }
});

app.delete("/api/categories/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const used = queries.txnsByCategory.get(id)?.count || 0;
  if (used > 0) return res.status(400).json({ error: "Category is in use" });
  queries.deleteCategory.run(id);
  return res.json({ ok: true });
});

app.get("/api/transactions", (req, res) => {
  const q = req.query;
  const rows = queries.listTxns.all(
    q.type || null,
    q.type || null,
    q.category_id ? Number(q.category_id) : null,
    q.category_id ? Number(q.category_id) : null,
    q.from || null,
    q.from || null,
    q.to || null,
    q.to || null,
    q.search ? String(q.search).toLowerCase() : null,
    q.search ? String(q.search).toLowerCase() : null
  );
  res.json(rows);
});

app.post("/api/transactions", (req, res) => {
  const p = safeParseTxn(req.body);
  if (!p) return res.status(400).json({ error: "Invalid payload" });
  queries.insertTxn.run(
    p.amount,
    p.type,
    p.category_id,
    p.note || null,
    normalizeDate(p.txn_date),
    p.source || "dashboard",
    p.created_by || "web",
    dayjs().toISOString()
  );
  res.status(201).json({ ok: true });
});

app.put("/api/transactions/:id", (req, res) => {
  const id = Number(req.params.id);
  const p = safeParseTxn(req.body);
  if (!id || !p) return res.status(400).json({ error: "Invalid payload" });
  queries.updateTxn.run(p.amount, p.type, p.category_id, p.note || null, normalizeDate(p.txn_date), id);
  res.json({ ok: true });
});

app.delete("/api/transactions/:id", (req, res) => {
  queries.deleteTxn.run(Number(req.params.id));
  res.json({ ok: true });
});

app.get("/api/overview", (_req, res) => {
  const now = dayjs();
  const currentStart = now.startOf("month").format("YYYY-MM-DD");
  const currentEnd = now.endOf("month").format("YYYY-MM-DD");
  const prevStart = now.subtract(1, "month").startOf("month").format("YYYY-MM-DD");
  const prevEnd = now.subtract(1, "month").endOf("month").format("YYYY-MM-DD");

  const current = periodTotals(currentStart, currentEnd);
  const previous = periodTotals(prevStart, prevEnd);
  const recent = queries.listTxns.all(null, null, null, null, null, null, null, null, null, null).slice(0, 8);
  res.json({ current, previous, recent });
});

app.get("/api/analytics", (_req, res) => {
  const rows = queries.listTxns.all(null, null, null, null, null, null, null, null, null, null);
  const byCategory = {};
  const monthly = {};
  rows.forEach((r) => {
    byCategory[r.category_name] = (byCategory[r.category_name] || 0) + r.amount;
    const key = r.txn_date.slice(0, 7);
    if (!monthly[key]) monthly[key] = { month: key, income: 0, expense: 0 };
    monthly[key][r.type] += r.amount;
  });
  res.json({
    byCategory: Object.entries(byCategory).map(([name, amount]) => ({ name, amount })),
    monthly: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
  });
});

app.get("/api/insights", (_req, res) => {
  const txns = queries.listTxns.all(null, null, null, null, null, null, null, null, null, null);
  const topExpense = txns
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amount - a.amount)[0];
  const recent7 = txns.filter((t) => dayjs(t.txn_date).isAfter(dayjs().subtract(7, "day")));
  const burn = recent7.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const earn = recent7.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const runwayDays = burn > 0 ? Math.floor((earn / burn) * 30) : null;
  res.json({
    topExpense,
    runwayDays,
    alert: burn > earn ? "Warning: last 7 days expenses exceeded income." : "Healthy: income covers recent spending.",
  });
});

const webDist = path.join(__dirname, "..", "dist");
app.use(express.static(webDist));
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  if (req.method !== "GET") return next();
  res.sendFile(path.join(webDist, "index.html"));
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API on http://localhost:${port}`));

const bot = createBot();
if (bot) {
  bot.launch().then(() => console.log("Telegram bot launched"));
}
