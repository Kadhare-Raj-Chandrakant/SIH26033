'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStoredToken, clearStoredToken, demoLoginBuyer } from '@/lib/api';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsDemoBuyer: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  isLoading: true,
  loginAsDemoBuyer: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(() => !getStoredToken());

  useEffect(() => {
    if (!token) {
      demoLoginBuyer()
        .then(({ token: newToken }) => {
          setToken(newToken);
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
      const { token: newToken } = await demoLoginBuyer();
      setToken(newToken);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        isLoading,
        loginAsDemoBuyer: handleDemoLogin,
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
