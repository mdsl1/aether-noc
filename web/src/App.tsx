import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ArchipelagoPage } from './pages/ArchipelagoPage';
import { LoginPage } from './pages/LoginPage';

const queryClient = new QueryClient();

const AppRouter: React.FC = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const syncUrl = () => {
      const currentPath = window.location.pathname || '/';
      if (!isAuthenticated && currentPath !== '/login') {
        window.history.replaceState(null, '', '/login');
      } else if (isAuthenticated && currentPath === '/login') {
        window.history.replaceState(null, '', '/');
      }
    };

    syncUrl();
    window.addEventListener('popstate', syncUrl);
    return () => window.removeEventListener('popstate', syncUrl);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <ArchipelagoPage />;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
