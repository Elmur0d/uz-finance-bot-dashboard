import { NavLink } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>UzBiz Finance</h1>
        <p>Cashflow Control Center</p>
        <nav>
          <NavLink to="/">Overview</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          <NavLink to="/categories">Categories</NavLink>
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
