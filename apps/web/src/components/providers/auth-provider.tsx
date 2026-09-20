'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStoredToken, setStoredToken, clearStoredToken, demoLoginBuyer, demoLoginSeller } from '@/lib/api';

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

function decodeToken(token: string | null): { sub?: string; role?: string; exp?: number } | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Read auth credentials from storage on client mount
    try {
      const stored = getStoredToken();
      if (stored) {
        const decoded = decodeToken(stored);
        if (!decoded || (decoded.exp && decoded.exp * 1000 < Date.now())) {
          clearStoredToken();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('sih_auth_user');
          }
          setToken(null);
          setUser(null);
        } else {
          setToken(stored);
          if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('sih_auth_user');
            if (storedUser) {
              try {
                const parsed = JSON.parse(storedUser);
                if (decoded?.role && parsed.role !== decoded.role) {
                  parsed.role = decoded.role;
                }
                setUser(parsed);
              } catch {
                setUser(null);
              }
            }
          }
        }
      }
    } catch {
      // Storage unavailable or error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const { token: newToken, user: newUser } = await demoLoginBuyer();
      setStoredToken(newToken);
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
      setStoredToken(newToken);
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
    setStoredToken(newToken);
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
