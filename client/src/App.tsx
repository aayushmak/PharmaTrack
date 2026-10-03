import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { MedicinesPage } from "./pages/MedicinesPage";
import { MedicineDetailPage } from "./pages/MedicineDetailPage";
import { MedicineFormPage } from "./pages/MedicineFormPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";

// Wraps a page in the app chrome + auth gate.
function page(node: React.ReactNode) {
  return (
    <ProtectedRoute>
      <Layout>{node}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/medicines" replace />} />
      <Route path="/medicines" element={page(<MedicinesPage />)} />
      <Route path="/medicines/new" element={page(<MedicineFormPage />)} />
      <Route path="/medicines/:id" element={page(<MedicineDetailPage />)} />
      <Route path="/medicines/:id/edit" element={page(<MedicineFormPage />)} />
      <Route path="*" element={<Navigate to="/medicines" replace />} />
    </Routes>
  );
}