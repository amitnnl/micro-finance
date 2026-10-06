import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('microfin_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('microfin_token');
      if (storedToken) {
        try {
          const res = await api.get('auth/me');
          if (res.success && res.data.user) {
            setUser(res.data.user);
          } else {
            logout();
          }
        } catch (err) {
          // Token invalid or backend/database offline: clear session rather than faking active state
          console.warn('Session verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('auth/login', { email, password });
      if (response.success && response.data.token) {
        const { token, user } = response.data;
        localStorage.setItem('microfin_token', token);
        localStorage.setItem('microfin_user', JSON.stringify(user));
        setToken(token);
        setUser(user);
        return { success: true, message: response.message };
      }
      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      return { success: false, message: error.message || 'Invalid login credentials' };
    }
  };

  const logout = () => {
    localStorage.removeItem('microfin_token');
    localStorage.removeItem('microfin_user');
    setToken(null);
    setUser(null);
  };

  const rawRole = (user?.role || '').toLowerCase().trim();
  const isAdmin = rawRole === 'admin' || rawRole === 'system admin' || rawRole === 'administrator';
  const isManager = rawRole === 'manager' || rawRole === 'branch manager';
  const isStaff = !isAdmin && !isManager;
  const role = isAdmin ? 'admin' : (isManager ? 'manager' : 'staff');

  const permissions = {
    isAdmin,
    isManager,
    isStaff,
    role,
    canManageUsers: isAdmin,
    canAccessSettings: isAdmin,
    canViewProfitLoss: isAdmin,
    canDisburseLoan: isAdmin,
    canApproveLoan: isAdmin || isManager,
    canRejectLoan: isAdmin || isManager,
    canCheckDocuments: isAdmin || isManager,
    canImportExportLoans: isAdmin || isManager,
    canCreateLoan: true,
    canManageLeads: true,
    canCollectEmi: true,
    canViewStatements: true
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      logout, 
      isAuthenticated: !!token,
      role,
      isAdmin,
      isManager,
      isStaff,
      permissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
