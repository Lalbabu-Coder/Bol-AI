import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Analytics from './pages/Analytics.jsx';
import KnowledgeBase from './pages/KnowledgeBase.jsx';
import Conversations from './pages/Conversations.jsx';
import Contacts from './pages/Contacts.jsx';
import Channels from './pages/Channels.jsx';
import Calls from './pages/Calls.jsx';
import Workflows from './pages/Workflows.jsx';
import Billing from './pages/Billing.jsx';
import AdminCompanies from './pages/AdminCompanies.jsx';
import AdminMetrics from './pages/AdminMetrics.jsx';
import AdminHealth from './pages/AdminHealth.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export const App = () => {
  return (
    <Routes>
      {/* Public Authentication Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected tenant work area */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/knowledge-base"
        element={
          <ProtectedRoute>
            <KnowledgeBase />
          </ProtectedRoute>
        }
      />

      <Route
        path="/conversations"
        element={
          <ProtectedRoute>
            <Conversations />
          </ProtectedRoute>
        }
      />

      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        }
      />

      <Route
        path="/channels"
        element={
          <ProtectedRoute>
            <Channels />
          </ProtectedRoute>
        }
      />

      <Route
        path="/calls"
        element={
          <ProtectedRoute>
            <Calls />
          </ProtectedRoute>
        }
      />

      <Route
        path="/workflows"
        element={
          <ProtectedRoute>
            <Workflows />
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <Billing />
          </ProtectedRoute>
        }
      />

      {/* Superadmin Panel Routes */}
      <Route
        path="/admin/companies"
        element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <AdminCompanies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/metrics"
        element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <AdminMetrics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/health"
        element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <AdminHealth />
          </ProtectedRoute>
        }
      />

      {/* Fallback routing */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
