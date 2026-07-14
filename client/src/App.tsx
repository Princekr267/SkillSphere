import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ClientDashboard } from './pages/dashboards/ClientDashboard';
import { FreelancerDashboard } from './pages/dashboards/FreelancerDashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { BrowseGigs } from './pages/BrowseGigs';
import { GigDetail } from './pages/GigDetail';
import { GigChat } from './pages/GigChat';
import { LeaveReview } from './pages/LeaveReview';
import { FreelancerProfile } from './pages/FreelancerProfile';
import { NotFound } from './pages/NotFound';
import './App.css';

// Root level redirect based on user authentication and role
const HomeRedirect: React.FC = () => {
  const { user, token, loading } = useAuth();

  // Wait for auth token verification to complete before deciding where to go
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-line-gray"></div>
            <div className="absolute inset-0 rounded-full border-2 border-t-route-teal animate-spin"></div>
          </div>
          <p className="text-slate text-xs font-mono uppercase tracking-widest animate-pulse">Loading SkillSphere...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'client') return <Navigate to="/client-dashboard" replace />;
  if (user.role === 'freelancer') return <Navigate to="/freelancer-dashboard" replace />;

  return <Navigate to="/login" replace />;
};

const AppContent: React.FC = () => {
  return (
    <>
      <Navbar />
      <main className="flex-grow flex flex-col">
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Dashboards */}
          <Route
            path="/client-dashboard"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/freelancer-dashboard"
            element={
              <ProtectedRoute allowedRoles={['freelancer']}>
                <FreelancerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Gig Routes */}
          <Route
            path="/gigs"
            element={
              <ProtectedRoute allowedRoles={['freelancer']}>
                <BrowseGigs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gigs/:id"
            element={
              <ProtectedRoute allowedRoles={['freelancer', 'client']}>
                <GigDetail />
              </ProtectedRoute>
            }
          />

          {/* Gig Chat */}
          <Route
            path="/gigs/:id/chat"
            element={
              <ProtectedRoute allowedRoles={['freelancer', 'client']}>
                <GigChat />
              </ProtectedRoute>
            }
          />

          {/* Leave Review */}
          <Route
            path="/review/:gigId/:revieweeId"
            element={
              <ProtectedRoute allowedRoles={['freelancer', 'client']}>
                <LeaveReview />
              </ProtectedRoute>
            }
          />

          {/* Profile Route */}
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute allowedRoles={['freelancer', 'client']}>
                <FreelancerProfile />
              </ProtectedRoute>
            }
          />

          {/* Fallback Home Route */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

      </main>
      <Footer />
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
