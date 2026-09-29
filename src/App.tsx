import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { PublicRequestForm } from './components/PublicRequestForm';

function AppContent() {
  const { user, loading } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    setShowAdmin(path === '/admin' || path.startsWith('/admin'));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!showAdmin) {
    return <PublicRequestForm />;
  }

  return user ? <Dashboard /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
