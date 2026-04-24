import { useEffect, useState } from "react";
import api from "../api";
import EmptyState from "../components/EmptyState";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", type: "expense" });
  const [error, setError] = useState("");

  const load = async () => {
    const r = await api.get("/categories");
    setCategories(r.data);
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/categories", form);
      setForm({ name: "", type: "expense" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add category");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete category");
    }
  };

  return (
    <section>
      <h2>Categories</h2>
      {categories.length === 0 && <EmptyState title="No categories yet" body="Create categories for your business operations." />}
      <form className="quick-form" onSubmit={submit}>
        <input placeholder="Category name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <button type="submit">Create</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="cat-grid">
        {categories.map((c) => (
          <article key={c.id} className="cat-card">
            <h4>{c.name}</h4>
            <p>{c.type}</p>
            <small>{c.is_default ? "Default category" : "Custom category"}</small>
            {!c.is_default && <button onClick={() => remove(c.id)}>Delete</button>}
          </article>
        ))}
      </div>
    </section>
  );
}
