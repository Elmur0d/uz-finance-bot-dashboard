import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import api from "../api";
import EmptyState from "../components/EmptyState";

const COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#f59e0b", "#dc2626", "#9333ea"];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/analytics"), api.get("/insights")]).then(([a, i]) => {
      setData(a.data);
      setInsights(i.data);
    });
  }, []);

  if (!data || !insights) return <p>Loading...</p>;
  if (!data.monthly.length) {
    return <EmptyState title="Analytics will appear here" body="Add some transactions to unlock trend and category analysis." />;
  }

  return (
    <section>
      <h2>Analytics</h2>
      <div className="cards">
        <div className="card">
          <small>Cashflow Alert (extra feature)</small>
          <h3>{insights.alert}</h3>
          <span>{insights.runwayDays ? `Estimated runway: ${insights.runwayDays} days` : "Runway will appear when enough data exists."}</span>
        </div>
      </div>
      <div className="charts">
        <div className="chart-box">
          <h3>Income vs Expense Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="#16a34a" />
              <Bar dataKey="expense" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-box">
          <h3>Category Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.byCategory} dataKey="amount" nameKey="name" outerRadius={110} label>
                {data.byCategory.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
