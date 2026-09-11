'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStoredToken, clearStoredToken, demoLoginBuyer, demoLoginSeller } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsDemoBuyer: () => Promise<void>;
  loginAsDemoSeller: (role?: 'FARMER' | 'FPO') => Promise<void>;
  setAuth: (token: string, user?: AuthUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginAsDemoBuyer: async () => {},
  loginAsDemoSeller: async () => {},
  setAuth: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('sih_auth_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(() => !getStoredToken());

  useEffect(() => {
    if (!token) {
      demoLoginBuyer()
        .then(({ token: newToken, user: newUser }) => {
          setToken(newToken);
          setUser(newUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('sih_auth_user', JSON.stringify(newUser));
          }
        })
        .catch((err) => {
          console.warn('Auto demo login skipped:', err.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [token]);

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const { token: newToken, user: newUser } = await demoLoginBuyer();
      setToken(newToken);
      setUser(newUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sih_auth_user', JSON.stringify(newUser));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSellerLogin = async (role: 'FARMER' | 'FPO' = 'FARMER') => {
    setIsLoading(true);
    try {
      const { token: newToken, user: newUser } = await demoLoginSeller(role);
      setToken(newToken);
      setUser(newUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sih_auth_user', JSON.stringify(newUser));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setAuth = (newToken: string, newUser?: AuthUser | null) => {
    setToken(newToken);
    if (newUser) {
      setUser(newUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sih_auth_user', JSON.stringify(newUser));
      }
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sih_auth_user');
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        loginAsDemoBuyer: handleDemoLogin,
        loginAsDemoSeller: handleDemoSellerLogin,
        setAuth,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
