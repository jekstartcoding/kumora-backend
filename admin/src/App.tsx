// Fase 6.4 — Routing: /admin/login di luar guard; resource di dalam guard + layout.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import AuthGuard from './components/AuthGuard';
import LoginPage from './pages/LoginPage';
import ProductsPage from './resources/products/ProductsPage';
import ProductFormPage from './resources/products/ProductFormPage';
import QuizOptionsPage from './resources/quizOptions/QuizOptionsPage';
import QuizMappingsPage from './resources/quizMappings/QuizMappingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <AuthGuard>
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/admin/products" replace />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductFormPage />} />
          <Route path="quiz-options" element={<QuizOptionsPage />} />
          <Route path="quiz-mappings" element={<QuizMappingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
