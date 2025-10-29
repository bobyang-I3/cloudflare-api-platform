import React, { useState, useEffect } from 'react';
import { authApi, User } from './api';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import { ThemeProvider } from './contexts/ThemeContext';

type Page = 'login' | 'register' | 'dashboard';

export default function App() {
  const [page, setPage] = useState<Page>('login');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      authApi.getMe(savedToken)
        .then(userData => {
          setToken(savedToken);
          setUser(userData);
          setPage('dashboard');
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const tokenData = await authApi.login({ username, password });
    const userData = await authApi.getMe(tokenData.access_token);
    
    // Clean up old global conversation keys (migration cleanup)
    localStorage.removeItem('conversations');
    localStorage.removeItem('lastConversationId');
    
    setToken(tokenData.access_token);
    setUser(userData);
    localStorage.setItem('token', tokenData.access_token);
    setPage('dashboard');
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    await authApi.register({ username, email, password });
    // After registration, auto-login
    await handleLogin(username, password);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    
    // Clean up old global conversation keys (migration cleanup)
    localStorage.removeItem('conversations');
    localStorage.removeItem('lastConversationId');
    
    setPage('login');
  };

  return (
    <ThemeProvider>
      {loading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          color: 'white',
          fontSize: '18px'
        }}>
          Loading...
        </div>
      )}

      {!loading && page === 'login' && (
        <LoginPage onLogin={handleLogin} onSwitchToRegister={() => setPage('register')} />
      )}

      {!loading && page === 'register' && (
        <RegisterPage onRegister={handleRegister} onSwitchToLogin={() => setPage('login')} />
      )}

      {!loading && page === 'dashboard' && token && user && (
        <Dashboard token={token} user={user} onLogout={handleLogout} />
      )}
    </ThemeProvider>
  );
}

