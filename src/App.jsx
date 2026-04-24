import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import OverviewPage from "./pages/OverviewPage";
import TransactionsPage from "./pages/TransactionsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CategoriesPage from "./pages/CategoriesPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
