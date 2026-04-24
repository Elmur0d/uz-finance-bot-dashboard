import { useEffect, useState } from "react";
import api from "../api";
import EmptyState from "../components/EmptyState";

export default function TransactionsPage() {
  const [txns, setTxns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ type: "", category_id: "", from: "", to: "", search: "" });
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});

  const load = async () => {
    const [t, c] = await Promise.all([api.get("/transactions", { params: filters }), api.get("/categories")]);
    setTxns(t.data);
    setCategories(c.data);
  };

  useEffect(() => {
    load();
  }, [filters.type, filters.category_id, filters.from, filters.to, filters.search]);

  const removeTxn = async (id) => {
    await api.delete(`/transactions/${id}`);
    load();
  };

  const startEdit = (t) => {
    setEditId(t.id);
    setDraft(t);
  };
  const save = async () => {
    await api.put(`/transactions/${editId}`, {
      amount: Number(draft.amount),
      type: draft.type,
      category_id: Number(draft.category_id),
      note: draft.note,
      txn_date: draft.txn_date,
    });
    setEditId(null);
    load();
  };

  return (
    <section>
      <h2>Transactions</h2>
      <div className="filters">
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <input placeholder="Search note" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
      </div>
      {txns.length === 0 ? (
        <EmptyState title="No matching transactions" body="Try broader filters or add a new record from Overview." />
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>ID</th><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Note</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{editId === t.id ? <input type="date" value={draft.txn_date} onChange={(e) => setDraft({ ...draft, txn_date: e.target.value })} /> : t.txn_date}</td>
                <td>
                  {editId === t.id ? (
                    <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                      <option value="income">income</option>
                      <option value="expense">expense</option>
                    </select>
                  ) : t.type}
                </td>
                <td>
                  {editId === t.id ? (
                    <select value={draft.category_id} onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}>
                      {categories.filter((c) => c.type === draft.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : t.category_name}
                </td>
                <td>{editId === t.id ? <input value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /> : Math.round(t.amount).toLocaleString()}</td>
                <td>{editId === t.id ? <input value={draft.note || ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /> : (t.note || "-")}</td>
                <td>
                  {editId === t.id ? (
                    <>
                      <button onClick={save}>Save</button>
                      <button onClick={() => setEditId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(t)}>Edit</button>
                      <button onClick={() => removeTxn(t.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
