import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AppointmentsPage from './pages/AppointmentsPage';
import LeadsPage from './pages/LeadsPage';
import LoansPage from './pages/LoansPage';
import EmisPage from './pages/EmisPage';
import EmiReportPage from './pages/EmiReportPage';
import ReportsPage from './pages/ReportsPage';
import TotalProfitLossPage from './pages/TotalProfitLossPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import PublicWebsitePage from './pages/PublicWebsitePage';

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// Role-Based Route Guard (Admin / Manager / Staff)
function RoleRoute({ allowedRoles, children }) {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (!allowedRoles.includes(role || 'staff')) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/public" element={<PublicWebsitePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="create-lead" element={<AppointmentsPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="loans" element={<LoansPage />} />
                <Route path="emis" element={<EmisPage />} />
                <Route path="emi-report" element={<EmiReportPage />} />
                <Route path="reports" element={<RoleRoute allowedRoles={['admin']}><ReportsPage /></RoleRoute>} />
                <Route path="total-profit-loss" element={<RoleRoute allowedRoles={['admin']}><TotalProfitLossPage /></RoleRoute>} />
                <Route path="users" element={<RoleRoute allowedRoles={['admin']}><UsersPage /></RoleRoute>} />
                <Route path="settings" element={<RoleRoute allowedRoles={['admin']}><SettingsPage /></RoleRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
