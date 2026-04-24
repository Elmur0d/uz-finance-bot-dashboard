import { useEffect, useState } from "react";
import api from "../api";
import EmptyState from "../components/EmptyState";

const initialForm = { amount: "", type: "income", category_id: "", note: "", txn_date: "" };

function delta(cur, prev) {
  if (!prev) return "0%";
  return `${(((cur - prev) / prev) * 100).toFixed(1)}%`;
}

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);

  const load = async () => {
    const [overview, cat] = await Promise.all([api.get("/overview"), api.get("/categories")]);
    setData(overview.data);
    setCategories(cat.data);
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/transactions", {
      ...form,
      amount: Number(form.amount),
      category_id: Number(form.category_id),
      source: "dashboard",
    });
    setForm(initialForm);
    load();
  };

  if (!data) return <p>Loading...</p>;

  const hasData = data.recent.length > 0;
  return (
    <section>
      <h2>Overview</h2>
      {!hasData && (
        <EmptyState
          title="No transactions yet"
          body="Start by adding your first income or expense below, or log one in Telegram."
        />
      )}
      <div className="cards">
        <div className="card">
          <small>Income (month)</small>
          <h3>{Math.round(data.current.income).toLocaleString()} UZS</h3>
          <span>{delta(data.current.income, data.previous.income)} vs last month</span>
        </div>
        <div className="card">
          <small>Expense (month)</small>
          <h3>{Math.round(data.current.expense).toLocaleString()} UZS</h3>
          <span>{delta(data.current.expense, data.previous.expense)} vs last month</span>
        </div>
        <div className="card">
          <small>Net (month)</small>
          <h3>{Math.round(data.current.net).toLocaleString()} UZS</h3>
          <span>{delta(data.current.net, data.previous.net)} vs last month</span>
        </div>
      </div>

      <form className="quick-form" onSubmit={submit}>
        <h3>Quick Add</h3>
        <input placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
          <option value="">Category</option>
          {categories
            .filter((c) => c.type === form.type)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <input type="date" value={form.txn_date} onChange={(e) => setForm({ ...form, txn_date: e.target.value })} />
        <input placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button type="submit">Add</button>
      </form>

      <h3>Recent Activity</h3>
      <ul className="recent-list">
        {data.recent.map((t) => (
          <li key={t.id}>
            <strong>{t.type === "income" ? "+" : "-"}{Math.round(t.amount).toLocaleString()} UZS</strong> {t.category_name} on {t.txn_date}
          </li>
        ))}
      </ul>
    </section>
  );
}
