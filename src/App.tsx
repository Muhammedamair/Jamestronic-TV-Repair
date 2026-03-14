import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TicketListPage from './pages/tickets/TicketListPage';
import TicketCreatePage from './pages/tickets/TicketCreatePage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import DealerLayout from './layouts/DealerLayout';
import DealerDashboardPage from './pages/dealer/DealerDashboardPage';
import PartRequestsPage from './pages/part-requests/PartRequestsPage';
import AdminDealersPage from './pages/part-requests/AdminDealersPage';
import AdminTechniciansPage from './pages/technicians/AdminTechniciansPage';
import TechnicianLayout from './layouts/TechnicianLayout';
import TechDashboardPage from './pages/technician/TechDashboardPage';
import TechTicketDetailPage from './pages/technician/TechTicketDetailPage';
import TransporterLayout from './layouts/TransporterLayout';
import AdminTransportersPage from './pages/transporters/AdminTransportersPage';
import TransporterDashboardPage from './pages/transporter/TransporterDashboardPage';
import GoogleMapsProvider from './components/GoogleMapsProvider';
import AnalyticsPage from './pages/AnalyticsPage';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', backgroundColor: '#0A0E1A' }}>
      <CircularProgress sx={{ color: '#6C63FF' }} />
    </Box>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'DEALER') return <Navigate to="/dealer" replace />;
    if (role === 'TECHNICIAN') return <Navigate to="/tech" replace />;
    if (role === 'DRIVER') return <Navigate to="/transport" replace />;
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (role === 'DEALER') return <Navigate to="/dealer" replace />;
    if (role === 'TECHNICIAN') return <Navigate to="/tech" replace />;
    if (role === 'DRIVER') return <Navigate to="/transport" replace />;
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <GoogleMapsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            
            {/* Admin Routes */}
            <Route path="/" element={<ProtectedRoute allowedRoles={['ADMIN']}><MainLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="tickets" element={<TicketListPage />} />
              <Route path="tickets/new" element={<TicketCreatePage />} />
              <Route path="tickets/:id" element={<TicketDetailPage />} />
              <Route path="customers" element={<CustomerListPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="parts" element={<PartRequestsPage />} />
              <Route path="dealers" element={<AdminDealersPage />} />
              <Route path="technicians" element={<AdminTechniciansPage />} />
              <Route path="transporters" element={<AdminTransportersPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>

            {/* Dealer Routes */}
            <Route path="/dealer" element={<ProtectedRoute allowedRoles={['DEALER']}><DealerLayout /></ProtectedRoute>}>
              <Route index element={<DealerDashboardPage />} />
            </Route>

            {/* Technician Routes */}
            <Route path="/tech" element={<ProtectedRoute allowedRoles={['TECHNICIAN']}><TechnicianLayout /></ProtectedRoute>}>
              <Route index element={<TechDashboardPage />} />
              <Route path=":id" element={<TechTicketDetailPage />} />
            </Route>

            {/* Transporter Routes */}
            <Route path="/transport" element={<ProtectedRoute allowedRoles={['DRIVER']}><TransporterLayout /></ProtectedRoute>}>
              <Route index element={<TransporterDashboardPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </GoogleMapsProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
