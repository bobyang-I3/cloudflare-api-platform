import { useState, useEffect } from 'react';
import { authApi, User } from './api';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';

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

  if (loading) {
    return (
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
    );
  }

  if (page === 'login') {
    return <LoginPage onLogin={handleLogin} onSwitchToRegister={() => setPage('register')} />;
  }

  if (page === 'register') {
    return <RegisterPage onRegister={handleRegister} onSwitchToLogin={() => setPage('login')} />;
  }

  if (page === 'dashboard' && token && user) {
    return <Dashboard token={token} user={user} onLogout={handleLogout} />;
  }

  return null;
}

